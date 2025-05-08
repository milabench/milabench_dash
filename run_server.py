from old_school.view import view_server

if __name__ == "__main__":
    app = view_server({})
    app.run(debug=True, port=5000)