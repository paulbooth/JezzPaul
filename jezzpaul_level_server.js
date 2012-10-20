var express = require('express'),
    app = express();

app.set('views', __dirname + '/views');
app.get("/:level", function(req, res) {
	res.render("level.jade", {level: level});
});
app.listen(3333);