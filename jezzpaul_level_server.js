var express = require('express'),
    app = express();

app.set('views', __dirname + '/views');
app.get("/:level", function(req, res) {
	var level = req.params.level;
	res.render("level.jade", {level: level});
});
app.listen(3333);