var canvasElement;
var drawingContext;
var pattern;

var gameWidth = 600;
var gameHeight = 600;
var canvasMinX;
var canvasMinY;
var lineGrowSpeed = 5;
var gameLevel = 1;
var lineWidth = 5;
var updateTimer = 20;
var winProportion = .2;

var backgroundImage = new Image();
var gamePaused = false;
var gameWon = true;
var textColor = [125,125,125];
//var shadowOn = 0;
//no one likes shadows

var balls = [];
var lines = [];

// last touchX and Y position to detect which type of swipe was encountered
var touchX, touchY, lastTouchX, lastTouchY;

function Ball(x, y, r, dx, dy) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.dx = dx;
    this.dy = dy;
    this.rect = [0+lineWidth, 0+lineWidth,
		 gameWidth-lineWidth, gameHeight-lineWidth];
    this.update = function() {
	this.x += this.dx;
	this.y += this.dy;
	if (( this.x+this.r > this.rect[2] && this.dx > 0)
	    || (this.x-this.r < this.rect[0] && this.dx < 0)) {
	    this.dx = -this.dx;
	}
	if ((this.y+this.r > this.rect[3] && this.dy > 0)
	    || (this.y-this.r < this.rect[1] && this.dy < 0 )) {
	    this.dy = -this.dy;
	}
	this.checkLineHits();
    }

    this.checkLineHits = function () {
	for (lnum in lines) {
	    var line = lines[lnum];
	    if (line.type) {
		/*horizontal*/
		if ((line.y > this.y - this.r)
		    && (line.y < this.y + this.r)
		    && (line.x + line.size2 > this.x - this.r)
		    && (line.x - line.size1 < this.x + this.r)) {
		    if ((line.growing1 || line.growing2)
		      && line.rect == this.rect) {
			//totes lost
			loseGame();

			//initializeGame();
		    }
		}
	    } else { /*vertical*/
		if ((line.x > this.x - this.r)
		    && (line.x < this.x + this.r)
		    && (line.y + line.size2 > this.y - this.r)
		    && (line.y - line.size1 < this.y + this.r)) {
		    if ((line.growing1 || line.growing2)
		      && line.rect == this.rect) {
			//totes lost
			loseGame();
			//initializeGame();
		    }
		}
	    }
	}


    }
    this.draw = function() {
	drawingContext.fillStyle = "rgb(0,"
	+Math.round(this.y/gameHeight*255)+","
	+(255-Math.round(this.x/gameWidth*255))+")";
	drawCircle(this.x, this.y, this.r);
    }
}

function point_inline(x,y) {
    for (lnum in lines) {
	var line = lines[lnum];
	if ( (!line.type &&
	      (x > line.x - lineWidth/2) && (x < line.x + lineWidth/2 )
	      && (y > line.y - line.size1) && (y < line.y + line.size2)) ||
	     (line.type &&
	      (y > line.y - lineWidth/2) && (y < line.y + lineWidth/2 )
	      && (x > line.x - line.size1) && (x < line.x + line.size2)) )
	    return true;
    }
    return false;
}

function point_inrect(x,y) {
    for (ballnum in balls) {
	var rect = balls[ballnum].rect;
	if ( (rect[0] <= x) && (rect[2] >= x)
	     && (rect[1] <= y) && (rect[3] >= y) ) {
	    return rect;
	}
    }
    return false;
}

function get_all_balls(x,y) {
    var retballs = [];
    for (ballnum in balls) {
	var rect = balls[ballnum].rect;
	if ( (rect[0] <= x) && (rect[2] >= x)
	     && (rect[1] <= y) && (rect[3] >= y) ) {
	    retballs.push(balls[ballnum]);
	}
    }
    return retballs;
}

function get_all_lines(x,y) {
    var retlines = [];
    for (lnum in lines) {
	var rect = lines[lnum].rect;
	if ( (rect[0] <= x) && (rect[2] >= x)
	     && (rect[1] <= y) && (rect[3] >= y) ) {
	    retlines.push(lines[lnum]);
	}
    }
    return retlines;
}

function correct_rects(newrect) {
    var ret = [];
    for (ballnum in balls) {
	var ball = balls[ballnum];
	if ( ( newrect[0]  <= ball.x)
	     && (newrect[2]  >= ball.x)
	     && (newrect[1] <= ball.y)
	     && (newrect[3]  >= ball.y) ) {
	    ret.push(balls[ballnum]);
	    balls[ballnum].rect = newrect;
	}
    }
    for (linenum in lines) {
	var line = lines[linenum];
	if ( ( newrect[0] <= line.x)
	     && (newrect[2] >= line.x)
	     && (newrect[1]  <= line.y)
	     && (newrect[3]  >= line.y) ) {
	    ret.push(lines[linenum]);
	    lines[linenum].rect = newrect;
	}
    }
    return ret;

}

function drawCircle(x,y,r)
{
    drawingContext.beginPath();
    drawingContext.arc(x,y,r,0,Math.PI*2, true);
    drawingContext.closePath();
    drawingContext.fill();
}

function clear()
{
    drawingContext.clearRect(0,0,gameWidth,gameHeight);
}

function drawBackground()
{

    if (backgroundImage != null) {
		try{
			if (backgroundImage.complete) {
			drawingContext.drawImage(backgroundImage, 0, 0, gameWidth, gameHeight);
			} else {
				//setTimeout(function() { backgroundImage.complete}, 0);
			}
		}
		catch(err) {
			alert(err);
		    backgroundImage = null;
		}
    } else {
		drawingContext.beginPath();
		drawingContext.rect(0,0,gameWidth,gameHeight);
		drawingContext.closePath();
		drawingContext.fillStyle = "#000000";
		drawingContext.fill();
    }



    for (ballnum in balls){
	drawingContext.beginPath();
	var rect = balls[ballnum].rect;
	drawingContext.rect(rect[0],rect[1],rect[2]-rect[0],rect[3]-rect[1]);
	drawingContext.closePath();
	drawingContext.fillStyle = "#FFFFFF";
	drawingContext.strokeStyle = "#AA0000";
	drawingContext.lineWidth = lineWidth;
	drawingContext.fill();
	drawingContext.stroke();
	drawingContext.fillStyle = "#0000FF";
	drawCircle(rect[0], rect[1], 10);
	drawCircle(rect[2], rect[3], 10);
    }

}

function update_and_draw()
{
    var propuncovered = null;
    if (!gamePaused) {
		for ( lnum in lines) {
		    var line = lines[lnum];
		    if (line.growing1 || line.growing2) {
			line.grow();
		    }
		}
		propuncovered = get_prop_uncovered();
		if (propuncovered < winProportion) {
		    winGame();
		}
		for ( ballnum in balls) {
		    var ball = balls[ballnum];
		    ball.update();
		}
		drawAll(propuncovered);
    } else {
		drawAll(get_prop_uncovered());
    }

}

function drawAll(propuncovered) {
    //clear();
    drawBackground();

    drawingContext.setAlpha( gamePaused?.5:1);
    for ( ballnum in balls) {
	var ball = balls[ballnum];
	ball.draw();
	drawProp(ball.rect, propuncovered);
    }
    for ( lnum in lines) {
	var line = lines[lnum];
	line.draw();
    }
    if (gamePaused) {
	drawText();
    }
}

function drawText() {
    var font = "sans";
    var fontsize = 78;
    var y = drawingContext.fontAscent(font, fontsize);
    for (var i = 0; i < textColor.length; i++) {
	textColor[i] = Math.min(
				Math.max(
					 Math.round(
						    textColor[i]
						    +Math.random()*6-3)
					 ,0)
				, 255);

    }
    drawingContext.strokeStyle = "rgba("
	+textColor.toString()+",1)";
    //drawingContext.fillStyle = "rgba(0,0,0,.75)";
    drawingContext.drawTextCenter(font, fontsize, gameWidth/2, y, gameWon?"YOU WIN!!!":"YOU LOSE!!!");
    //drawingContext.drawTextCenter(font, fontsize, gameWidth/2, y, gameWon?"YOU WIN!!!":"YOU LOSE!!!");
}

function drawProp(rect, propuncovered) {
    drawingContext.fillText("Level:"+gameLevel+
			    "\nNext Level:"+
			    ((1-propuncovered)/(1-winProportion)*100).toFixed(1)
			    +"%", (rect[0] + rect[2]) / 2 - 55,
			    (rect[1] +rect[3]) / 2);

}

function get_prop_uncovered() {
    var uncovered_area = 0;
    var seen_rects = [];
    for (bnum in balls) {
	var rect = balls[bnum].rect;
	if (seen_rects.indexOf(rect) == -1) {
	    seen_rects.push(rect);
	    uncovered_area += (rect[2] - rect[0]) * (rect[3] - rect[1]);
	}
    }
    return uncovered_area/(gameWidth*gameHeight);

}

function Line(x,y,rect, type)
{
    this.x = x;
    this.y = y;
    this.size1 = 0;
    this.size2 = 0;
    this.type = type;
    this.growing1 = true;
    this.growing2 = true;
    this.rect = rect;
    //alert(rect);
    this.grow = function() {
	if (this.growing1)
	    this.size1 += lineGrowSpeed;
	if (this.growing2)
	    this.size2 += lineGrowSpeed;
	if  (this.type && (this.x - this.size1 < this.rect[0])) {
	    this.growing1 = false;
	    this.size1 = this.x - this.rect[0] - 1;
	}
	if (!this.type && (this.y - this.size1 < this.rect[1]) ) {
	    this.growing1 = false;
	    this.size1 = this.y - this.rect[1] - 1;
	    //alert("type:"+this.type+"\nx:"+this.x+"\ny:"+this.y+
	    //	  "\nsize1:"+this.size1+"\nsize2:"
	    //	  +this.size2+"\nrect:"+this.rect);
	}
	if  (this.type && (this.x + this.size2 > this.rect[2])) {
	    this.growing2 = false;
	    this.size2 = this.rect[2] - this.x - 1;
	}
	if (!this.type && (this.y + this.size2 > this.rect[3])) {
	    this.growing2 = false;
	    this.size2 = this.rect[3] - this.y - 1;
	    //alert("X:"+this.x+" y:"+this.y+"size:"+this.size);
	}
	if (!this.growing1 && !this.growing2)
	    this.separateRect();
    }

    this.separateRect = function() {
	var currect = this.rect;
	var newrect1, newrect2;
	lines.splice(lines.indexOf(this),1);
	if (this.type) {
	    newrect1 = [currect[0],
			currect[1],
			currect[2],
			this.y];
	    newrect2 = [currect[0],
			this.y,
			currect[2],
			currect[3]];
	} else {
	    newrect1 = [currect[0],
			currect[1],
			this.x,
			currect[3]];
	    newrect2 = [this.x,
			currect[1],
			currect[2],
			currect[3]];
	}
	//alert("1:"+newrect1+"\n2:"+newrect2+"\nx:"+this.x+"\ny:"+this.y);
	correct_rects(newrect1);
	correct_rects(newrect2);
    }


    this.draw = function() {
	drawingContext.beginPath();
	if (type) {
	    drawingContext.moveTo(this.x-this.size1,
				  this.y);
	    drawingContext.lineTo(this.x+this.size2,
				    this.y);
				} else {
	    drawingContext.moveTo(this.x,
				  this.y-this.size1);
	    drawingContext.lineTo(this.x,
				    this.y+this.size2);
	}
	drawingContext.closePath();
	if (this.growing1) {
	    if (this.growing2) {
		drawingContext.strokeStyle = "#AAAA00";
	    } else {
		drawingContext.strokeStyle = "#00CCBB";
	    }
	} else{
	    if (this.growing2) {
		drawingContext.strokeStyle = "#00AA00";
	    } else {
		drawingContext.strokeStyle = "#000000";
	    }
	}
	drawingContext.lineWidth = lineWidth;
	drawingContext.stroke();
    };
}

function winGame() {
    //alert("Next Level!");
    gameWon = true;
    gameLevel += 1;
    lineGrowSpeed *= .9;
    gamePaused = true;
    //backgroundImage.src = winImageLocation;
    //initializeGame();

}

function loseGame() {
    lineGrowSpeed += .1;
    gamePaused = true;
    gameWon = false;
    //backgroundImage.src = loseImageLocation;
    //initializeGame();
}

function mousedown(evt)
{
    if (gamePaused) {
		gamePaused = false;
		initializeGame();
    } else {
		var x = evt.pageX - canvasMinX;
		var y = evt.pageY - canvasMinY;
		var type = evt.button;

		if (type == 1) {
		    //alert(point_inrect(x, y));
		    //  addRandomBall(balls[Math.floor ( Math.random() * balls.length )].rect);
		    //toggleShadow();
		}
		else {
		    if (!point_inline(x, y)){
			var rect = point_inrect(x, y);
			if (rect)
			    lines.push(new Line(x, y, rect, type));
		    }
		}
    }
}

function mouseup(evt)
{

}

function touchstart(evt)
{
	evt.preventDefault();
	if (evt.targetTouches.length) {
		var touch = evt.targetTouches[0];
		lastTouchX = touch.pageX;
		lastTouchY = touch.pageY ;
	}
}

function touchmove(evt)
{
	evt.preventDefault();
	if (evt.targetTouches.length) {
		var touch = evt.targetTouches[0];
		touchX = touch.pageX;
		touchY = touch.pageY;
	}
}

function touchend(evt)
{
	evt.preventDefault();
	if (gamePaused) {
		gamePaused = false;
		initializeGame();
    } else {
		if (lastTouchY && lastTouchX && touchX && touchY) {
			var type = (touchX  - lastTouchX) * (touchX  - lastTouchX) > (touchY  - lastTouchY) * (touchY  - lastTouchY) ? 2 : 0;
			var x = (touchX + lastTouchX) / 2  - canvasMinX, y = (touchY + lastTouchY) / 2 - canvasMinY;
			if (!point_inline(x, y)){
				var rect = point_inrect(x, y);
				if (rect)
				    lines.push(new Line(x, y, rect, type));
		    }
		    // reset touch variables
			lastTouchX = lastTouchY = touchX = touchY = null;
		}
	}
}

function keydown(evt)
{

}

function addRandomBall(rect) {
    var r = Math.random() * 10 + 7.5;
    var width = rect[2] - rect[0], height = rect[3] - rect[1];

    var ball = new Ball(Math.random()*(width - 2 * r)
			+ rect[0] + r,
			Math.random() * (height - 2 * r)
			+ rect[1] + r,
			r,
			(Math.random() * 7 + 1)*(Math.random() > .5?-1:1),
			(Math.random() * 7 + 1)*(Math.random() > .5?-1:1)  );
    ball.rect = rect;
    balls.push(ball);
}

function initializeGame()
{
    balls = [];
    lines = [];
    var rect = [0,0,gameWidth,gameHeight];
    for(var i=0;i<gameLevel;i++)
	addRandomBall(rect);
    backgroundImage.src = "http://catsinsinks.com/images/cats/rotator.php?"+Math.random();
}

/*function toggleShadow() {
    shadowOn = (shadowOn + 1) % 3;
    if (shadowOn) {
	drawingContext.shadowOffsetX = 10;
	drawingContext.shadowOffsetY = 10;
	drawingContext.shadowBlur = (shadowOn == 2)?10:0;
	drawingContext.shadowColor = "black";
    } else {
	drawingContext.shadowOffsetX = 0;
	drawingContext.shadowOffsetY = 0;
	drawingContext.shadowBlur = 0;
	drawingContext.shadowColor = "rgba(0,0,0,0.0)";
    }
    }*/

function initialize()
{
    canvasElement = document.createElement("canvas");
    canvasElement.id = "jezzball_canvas";
    if ($.browser.mobile) {
    	gameWidth = screen.width - 20;
    	$('#minititle_help').css('max-width', '' + gameWidth + 'px');
    	$('#bottom_content').css('max-width', '' + gameWidth + 'px');
    	var titleHeight = $('#title').height(),
    	miniTitleHeight = $('#minititle').height();
    	gameHeight = screen.height - titleHeight - miniTitleHeight;
    	window.scrollTo(0, 1); //hide address bar
    }

    canvasElement.width = gameWidth;
    canvasElement.height = gameHeight;

    if (!$.browser.mobile) {
	    canvasElement.onmousedown = mousedown;
	}
	canvasElement.ontouchstart = touchstart;
    canvasElement.ontouchmove = touchmove;
    canvasElement.ontouchend = touchend;
    //canvasElement.onmouseup   = mouseup;
    //canvasElement.onkeydown = keydown;
    canvasElement.oncontextmenu="return false;";
    var title = document.getElementById("title");
    if (title)
	document.body.insertBefore(canvasElement, title.nextSibling);
    else
	document.body.insertBefore(canvasElement,document.body.childNodes[0]);
    //    document.body.appendChild(canvasElement);
    canvasMinX = canvasElement.offsetLeft;
    canvasMinY = canvasElement.offsetTop;
    //should make sure it's not null. whatever...
    drawingContext = canvasElement.getContext("2d");
    CanvasTextFunctions.enable(drawingContext);
    initializeGame();
    return setInterval(update_and_draw, updateTimer);
}

$(document).ready(function(){
	setTimeout(initialize, 300);
});



function helpToggle() {
	$('#help').toggle();
	if ($.browser.mobile) {
		if ($('#help').is(":visible")) {
			window.scrollTo(0, gameHeight + $('#title').height())
		} else {
			window.scrollTo(0,1)
		}
	}
}