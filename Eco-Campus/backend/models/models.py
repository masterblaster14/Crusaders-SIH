from backend.utils.db import db

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    uid = db.Column(db.String(100), unique=True, nullable=False)  # Firebase UID
    username = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    coins = db.Column(db.Integer, default=0)

class Quiz(db.Model):
    __tablename__ = "quizzes"
    id = db.Column(db.Integer, primary_key=True)
    question = db.Column(db.Text, nullable=False)
    option_a = db.Column(db.String(255))
    option_b = db.Column(db.String(255))
    option_c = db.Column(db.String(255))
    option_d = db.Column(db.String(255))
    correct_option = db.Column(db.String(1), nullable=False)

class Leaderboard(db.Model):
    __tablename__ = "leaderboard"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    score = db.Column(db.Integer, nullable=False)
