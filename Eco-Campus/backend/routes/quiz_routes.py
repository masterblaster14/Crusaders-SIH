from flask import Blueprint, jsonify, request
from backend.models.models import Quiz, db

quiz_bp = Blueprint("quiz", __name__)

@quiz_bp.route("/quiz/all", methods=["GET"])
def get_quizzes():
    quizzes = Quiz.query.all()
    return jsonify([{
        "id": q.id,
        "question": q.question,
        "options": [q.option_a, q.option_b, q.option_c, q.option_d],
        "correct_option": q.correct_option
    } for q in quizzes])
