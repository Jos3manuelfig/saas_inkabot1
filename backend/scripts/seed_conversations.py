"""Seed de conversaciones y mensajes de prueba para el tenant inkabot."""
import asyncio, sys, os, uuid
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

TENANT_ID = "23f3311f-96ec-4246-b16b-533a5b9181a9"

CONVERSATIONS = [
    {
        "user_phone": "+51987001001",
        "status": "sale_closed",
        "intent_summary": "Cliente compro plan Emprendedor",
        "messages": [
            ("user",      "Hola! quiero informacion sobre sus planes"),
            ("assistant", "Hola! Soy el asistente de INKABOT. Tenemos dos planes: Emprendedor a S/69/mes y Profesional a S/129/mes. El Emprendedor incluye hasta 500 mensajes diarios. Cual te interesa?"),
            ("user",      "el emprendedor suena bien, como contrato?"),
            ("assistant", "Perfecto! Para contratar el plan Emprendedor puedes escribirle directamente a nuestro equipo por WhatsApp al +51924940724 o escribirnos a contacto@inkabot.com. Te guiamos en todo el proceso!"),
            ("user",      "listo ya les escribi, gracias!"),
            ("assistant", "Excelente! Gracias por elegir INKABOT. En breve te contactamos para configurar tu bot. Que tengas un excelente dia!"),
        ],
    },
    {
        "user_phone": "+51976002002",
        "status": "active",
        "intent_summary": "Consultando precios y horarios",
        "messages": [
            ("user",      "buenos dias, a que hora atienden?"),
            ("assistant", "Buenos dias! Atendemos de Lunes a Sabado de 9am a 7pm. En que mas te puedo ayudar?"),
            ("user",      "cuanto cuesta el plan profesional?"),
            ("assistant", "El Plan Profesional tiene un costo de S/129 al mes e incluye hasta 2,000 mensajes diarios, soporte prioritario y reportes avanzados. Te gustaria mas informacion?"),
            ("user",      "si cuantos numeros de whatsapp puedo conectar?"),
            ("assistant", "Con el Plan Profesional puedes conectar hasta 3 numeros de WhatsApp diferentes. Cada numero tiene su propio bot personalizado. Te animas?"),
        ],
    },
    {
        "user_phone": "+51954003003",
        "status": "human_handoff",
        "intent_summary": "Problema tecnico con configuracion",
        "messages": [
            ("user",      "mi bot no esta respondiendo, necesito ayuda urgente"),
            ("assistant", "Entiendo tu preocupacion! Voy a conectarte con un asesor humano que pueda revisar tu configuracion. Un momento por favor."),
            ("user",      "ok gracias"),
            ("assistant", "Entendido. Te conecto con un asesor... Escribele directamente: https://wa.me/51924940724. Gracias por contactarnos!"),
        ],
    },
    {
        "user_phone": "+51943004004",
        "status": "sale_lost",
        "intent_summary": "Cliente decidio no contratar por precio",
        "messages": [
            ("user",      "hola cuanto cuesta"),
            ("assistant", "Hola! Nuestro plan Emprendedor esta desde S/69/mes. Que tipo de negocio tienes? Asi te recomiendo el plan ideal."),
            ("user",      "me parece caro, hay algo mas economico?"),
            ("assistant", "Entiendo! Nuestro Plan Emprendedor es el mas accesible del mercado para chatbots de WhatsApp con IA. Si lo comparas con contratar un asistente humano, el ahorro es enorme. Podemos hablar de tus necesidades especificas?"),
            ("user",      "no gracias, seguire buscando"),
        ],
    },
    {
        "user_phone": "+51912005005",
        "status": "active",
        "intent_summary": None,
        "messages": [
            ("user",      "ola"),
            ("assistant", "Hola! Bienvenido a INKABOT. Soy tu asistente virtual. En que te puedo ayudar hoy?"),
        ],
    },
]


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        # Verificar que no existan ya conversaciones
        result = await conn.execute(text("SELECT COUNT(*) FROM conversations WHERE tenant_id = :tid"), {"tid": TENANT_ID})
        if result.scalar() > 0:
            print("Ya existen conversaciones para este tenant. Omitiendo seed.")
            await engine.dispose()
            return

        # Crear un numero de WhatsApp ficticio para el tenant
        wa_id = str(uuid.uuid4())
        await conn.execute(text("""
            INSERT INTO whatsapp_numbers (id, tenant_id, phone_number, display_name, status, bot_active, created_at, updated_at)
            VALUES (:id, :tenant_id, :phone, :name, 'connected', true, NOW(), NOW())
            ON CONFLICT (phone_number) DO NOTHING
        """), {"id": wa_id, "tenant_id": TENANT_ID, "phone": "+51900000000", "name": "INKABOT Demo"})

        # Recuperar el id real por si ya existia
        result = await conn.execute(text("SELECT id FROM whatsapp_numbers WHERE tenant_id = :tid LIMIT 1"), {"tid": TENANT_ID})
        wa_id = result.scalar_one()

        for i, conv_data in enumerate(CONVERSATIONS):
            conv_id = str(uuid.uuid4())
            offset_hours = (len(CONVERSATIONS) - i) * 8
            conv_ts = f"NOW() - INTERVAL '{offset_hours} hours'"
            msg_count = len(conv_data["messages"])
            last_min = max(0, offset_hours * 60 - msg_count * 10)
            last_msg_ts = f"NOW() - INTERVAL '{last_min} minutes'"

            intent = conv_data["intent_summary"]
            await conn.execute(text(f"""
                INSERT INTO conversations (id, tenant_id, whatsapp_number_id, user_phone, is_active, status, intent_summary, last_message_at, created_at, updated_at)
                VALUES (:id, :tenant_id, :wa_id, :phone, true,
                        CAST(:status AS conversationstatus),
                        :intent, {last_msg_ts}, {conv_ts}, {conv_ts})
            """), {
                "id": conv_id,
                "tenant_id": TENANT_ID,
                "wa_id": wa_id,
                "phone": conv_data["user_phone"],
                "status": conv_data["status"],
                "intent": intent,
            })

            for j, (role, content) in enumerate(conv_data["messages"]):
                msg_id = str(uuid.uuid4())
                await conn.execute(text(f"""
                    INSERT INTO messages (id, conversation_id, role, content, created_at)
                    VALUES (:id, :conv_id, CAST(:role AS messagerole), :content,
                            NOW() - INTERVAL '{offset_hours} hours' + INTERVAL '{j * 3} minutes')
                """), {"id": msg_id, "conv_id": conv_id, "role": role, "content": content})

        result = await conn.execute(text("SELECT COUNT(*) FROM conversations"))
        print(f"Conversaciones en BD: {result.scalar()}")
        result = await conn.execute(text("SELECT COUNT(*) FROM messages"))
        print(f"Mensajes en BD: {result.scalar()}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
