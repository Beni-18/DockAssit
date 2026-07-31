from database.database import engine, Base, SessionLocal
from models.user import User
from models.command_history import CommandHistory
from models.execution_log import ExecutionLog
from models.saved_prompt import SavedPrompt
from config.security import hash_password

def init_db():
    # Create all tables in SQLite
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if we already have the demo user
        demo_user = db.query(User).filter(User.email == "demo@dockmind.dev").first()
        if not demo_user:
            # Create demo user (password: demo1234)
            user = User(
                name="Demo User",
                email="demo@dockmind.dev",
                hashed_password=hash_password("demo1234"),
                role="admin"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            # Add sample saved prompts
            p1 = SavedPrompt(user_id=user.id, title="Restart Nginx", content="Restart the nginx container")
            p2 = SavedPrompt(user_id=user.id, title="Show Running Containers", content="List all running containers")
            p3 = SavedPrompt(user_id=user.id, title="Stop Redis", content="Stop the redis container")
            db.add_all([p1, p2, p3])
            db.commit()
            print("Successfully initialized and seeded the database!")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()
