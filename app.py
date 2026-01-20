from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import date
import os

app = Flask(__name__)

# MySQL DATABASE CONNECTION

app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://root:Tismarkhan0%40@localhost/mytodo'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(64), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(256))
    date = db.Column(db.Date, nullable=False, default=date.today)

    def to_dict(self):
        return {
            "id": self.id,
            "category": self.category,
            "amount": self.amount,
            "description": self.description,
            "date": self.date.isoformat() if self.date else None
        }


@app.cli.command("init-db")
def init_db():
    db.create_all()
    print("MySQL tables created successfully!")

# Shared categories
CATEGORIES = ["Food & Dining", "Transport", "Shopping", "Bills", "Other"]


@app.route("/")
def home():
    return redirect(url_for("dashboard"))

@app.route("/dashboard")
def dashboard():
    total = db.session.query(db.func.sum(Expense.amount)).scalar() or 0.0
    transactions = Expense.query.count()
    avg_per_day = (total / transactions) if transactions else 0.0
    recent = Expense.query.order_by(Expense.date.desc()).limit(3).all()

    return render_template(
        "dashboard.html",
        total=total,
        transactions=transactions,
        avg_per_day=avg_per_day,
        recent=recent,
        categories=CATEGORIES,
        date=date       
    )

@app.route("/add", methods=["GET", "POST"])
def add_page():
    if request.method == "POST":
        category = request.form.get("category")
        amount = request.form.get("amount", type=float)
        description = request.form.get("description", "")
        date_str = request.form.get("date")
        date_obj = date.fromisoformat(date_str) if date_str else date.today()

        if not category or not amount or amount <= 0:
            return redirect(url_for("add_page"))

        exp = Expense(category=category, amount=amount,
                      description=description, date=date_obj)
        db.session.add(exp)
        db.session.commit()
        return redirect(url_for("recent_expenses"))

    return render_template("add_expense.html", categories=CATEGORIES,date=date)

@app.route("/recent")
def recent_expenses():
    items = Expense.query.order_by(Expense.date.desc()).limit(50).all()
    return render_template("recent_expenses.html", expenses=items)

@app.route("/charts")
def charts_page():
    return render_template("charts.html")

# Delete
@app.route("/delete/<int:expense_id>", methods=["POST"])
def delete_expense(expense_id):
    exp = Expense.query.get_or_404(expense_id)
    db.session.delete(exp)
    db.session.commit()
    return redirect(request.referrer or url_for("recent_expenses"))

# --- APIs ---
@app.route("/api/summary")
def api_summary():
    rows = db.session.query(
        Expense.category,
        db.func.sum(Expense.amount)
    ).group_by(Expense.category).all()

    data = [{"category": r[0], "value": float(r[1] or 0)} for r in rows]
    return jsonify(data)

@app.route("/api/recent")
def api_recent():
    rows = Expense.query.order_by(Expense.date.desc()).limit(10).all()
    return jsonify([r.to_dict() for r in rows])

if __name__ == "__main__":
    app.run(debug=True)
