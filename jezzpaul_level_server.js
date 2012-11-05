var express = require('express'),
    app = express();

app.set('views', __dirname + '/views');
app.get("/:level", function(req, res) {
	var level = req.params.level;
  var score = req.query['score'];
	res.render("level.jade", {level: level, score: score});
});
app.listen(3333);