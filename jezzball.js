var canvasElement;
var drawingContext;
var pattern;

var gameWidth = 600;
var gameHeight = 600;
var canvasMinX;
var canvasMinY;
var lineGrowSpeed = 5;
var ballSpeed = 7;
var gameLevel = 1;
var lineWidth = 5;
var updateTimer = 20;
var winProportion = .2;

var backgroundImage = new Image();
var gamePaused = false;
var switchLines = false;
var gameWon = true;
var textColor = [125,125,125];
var lastUpdateTime = null; // time at last update call
var fbLoggedIn = false;
var showHelpText = false;
var initHelpTimer = null;
var helpTextTime = 5000;

var isBonusRound = false;
//                         0              1              2             3               4           5
var bonusRoundNames = ["Super Speed", "Cross Beam", "Crazy Balls", "Ninja Round", "Gravity", "Rotated Round"]
var bonusRoundType = 1;
var crazyBallChange = 1; // how much balls' velocities change during crazy balls
var score = 0;
var gravityDirection = 0;
var gravityStrength = .2;
var rotationAngle = 0;
var rotationSpeed = .01;

//var shadowOn = 0;
//no one likes shadows

var balls = [];
var lines = [];

// last touchX and Y position to detect which type of swipe was encountered
var touchX, touchY, lastTouchX, lastTouchY;

// last mouseX and Y for drawing the cursor in mac
var mouseX = 40, mouseY = 40;

// set up the requestAnimFrame method with fallbacks
window.requestAnimFrame = function(){
  return (
    window.requestAnimFrame            ||
    window.requestAnimationFrame       || 
    window.webkitRequestAnimationFrame || 
    window.mozRequestAnimationFrame    || 
    window.oRequestAnimationFrame      || 
    window.msRequestAnimationFrame     || 
    function(/* function */ callback){
        window.setTimeout(callback, 1000 / 60);
    }
  );
}();

function Ball(x, y, r, dx, dy) {
  this.x = x;
  this.y = y;
  this.r = r;
  this.dx = dx;
  this.dy = dy;
  this.rect = [0+lineWidth, 0+lineWidth,
    gameWidth-lineWidth, gameHeight-lineWidth];

  this.update = function(timeElapsed) {
    this.x += this.dx * timeElapsed;
    this.y += this.dy * timeElapsed;
    if (( this.x+this.r > this.rect[2] && this.dx > 0)
      || (this.x-this.r < this.rect[0] && this.dx < 0)) {
      this.dx = -this.dx;
      if (isBonusRound && bonusRoundType == 4) { // gravity
        if (this.dx > 0) {
          this.dx = Math.max(this.dx, this.r/5);
        } else {
          this.dx = Math.min(this.dx, -this.r/5)
        }
      }
    }
    if ((this.y+this.r > this.rect[3] && this.dy > 0)
      || (this.y-this.r < this.rect[1] && this.dy < 0 )) {
      this.dy = -this.dy;
      if (isBonusRound && bonusRoundType == 4) { // gravity
        if (this.dy > 0) {
          this.dy = Math.max(this.dy, this.r/5);
        } else {
          this.dy = Math.min(this.dy, -this.r/5)
        }
      }
    }
    this.checkLineHits();
    if (isBonusRound && bonusRoundType == 2) {// crazy balls
      this.dx += (Math.random() - .5) * crazyBallChange * timeElapsed;
      this.dy += (Math.random() - .5) * crazyBallChange * timeElapsed;
    } else if (isBonusRound && bonusRoundType == 4) { // gravity
      switch(gravityDirection) {
        case 0: this.dy += gravityStrength; break;
        // case 1: this.dx += gravityStrength; break;
        case 1: this.dy -= gravityStrength; break;
        // case 3: this.dx -= gravityStrength; break;
      }
    }
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

// clears the canvas
function clearCanvas()
{
    drawingContext.clearRect(0,0,gameWidth,gameHeight);
}

function drawBackground()
{
  if (backgroundImage != null) {
    try{
      if (backgroundImage.complete) {
        drawingContext.drawImage(backgroundImage, 0, 0, gameWidth, gameHeight);
      }
    }
    catch(err) {
      //alert(err);
        backgroundImage = null;
        drawingContext.beginPath();
      drawingContext.rect(0,0,gameWidth,gameHeight);
      drawingContext.closePath();
      drawingContext.fillStyle = "#000000";
      drawingContext.fill();
    }
  } else {
    drawingContext.beginPath();
    drawingContext.rect(0,0,gameWidth,gameHeight);
    drawingContext.closePath();
    drawingContext.fillStyle = "#000000";
    drawingContext.fill();
  }

  var drawnRects = [];
  for (ballnum in balls){
    drawingContext.beginPath();
    var rect = balls[ballnum].rect;
    if ((drawnRects.indexOf(rect) == -1)) {
      drawnRects.push(rect);
      drawingContext.rect(rect[0],rect[1],rect[2]-rect[0],rect[3]-rect[1]);
      drawingContext.closePath();
      drawingContext.fillStyle = "#FFFFFF";
      drawingContext.strokeStyle = "#AA0000";
      drawingContext.lineWidth = lineWidth;
      drawingContext.fill();
      drawingContext.stroke();
      drawingContext.fillStyle = "#0000FF";
      //drawCircle(rect[0], rect[1], 10);
      //drawCircle(rect[2], rect[3], 10);
    }
  }

  if (!useTouch()) {
    //line help
    drawingContext.beginPath();
    drawingContext.strokeStyle = "#AAAA00"
    if (switchLines) {
      drawingContext.moveTo(145, 10);
      drawingContext.lineTo(145, 30);
    } else {
      drawingContext.moveTo(135, 20);
      drawingContext.lineTo(155, 20);
    }
    drawingContext.closePath();
    drawingContext.stroke();
    drawingContext.strokeStyle = "#000";
    drawingContext.drawTextCenter("sans", 10, 70, 25, "space to switch to");
  } else {
    drawingContext.strokeStyle = "#000";
    drawingContext.drawTextCenter("sans", 10, 30, 25, gamePaused? "tap" : "swipe");
  }
}

// draws a mouse cursor
function drawMouseCursor()
{
  drawingContext.beginPath();
  drawingContext.strokeStyle = "#AAAA00"
  if (switchLines || (isBonusRound && bonusRoundType == 1)) {
    drawingContext.moveTo(mouseX - 10, mouseY);
    drawingContext.lineTo(mouseX + 10, mouseY);
  }
  if (!switchLines || (isBonusRound && bonusRoundType == 1)) {
    drawingContext.moveTo(mouseX, mouseY - 10);
    drawingContext.lineTo(mouseX, mouseY + 10);
  }
  drawingContext.closePath();
  drawingContext.stroke();
}


function drawHelpText()
{
    var font = "sans";
    var fontsize =  gameWidth / 8;
    var y = drawingContext.fontAscent(font, fontsize);
    updateTextColor();
    updateTextColor();
    drawingContext.strokeStyle = "rgba("
      + textColor.toString()+",1)";
    //drawingContext.fillStyle = "rgba(0,0,0,.75)";
    drawingContext.drawTextCenter(font, fontsize, 
      gameWidth/2, y, 
      useTouch()?"Swipe!":"Click!");
}


// var updateCounter = 0;
function update()
{
  // updateCounter++;
  // $('#title').text(updateCounter);
  var curUpdateTime = new Date().getTime();
  var timeElapsed = (curUpdateTime - lastUpdateTime)/updateTimer;
  lastUpdateTime = curUpdateTime;
  if (timeElapsed > 5) {
    timeElapsed = 1;
  }
  if (gamePaused) {
    return;
  }
  for ( lnum in lines) {
    var line = lines[lnum];
    if (line.growing1 || line.growing2) {
      line.grow(timeElapsed);
    }
  }
  if (get_prop_uncovered() < winProportion) {
    winGame();
  }
  for ( ballnum in balls) {
    var ball = balls[ballnum];
    ball.update(timeElapsed);
  }
}


function draw() {
  window.requestAnimFrame(draw, canvasElement);
  drawAll(get_prop_uncovered());
}


function drawAll(propuncovered) {
  // clearCanvas();
  if (isBonusRound && bonusRoundType == 5) {
    rotationAngle = (rotationAngle + rotationSpeed) % (2 * Math.PI);
    var transX = gameWidth/2, transY = gameHeight/2;
    
    drawingContext.translate(transX -  transX * Math.cos(rotationSpeed), 
        - transX * Math.sin(rotationSpeed));
      drawingContext.translate(transY * Math.sin(rotationSpeed), 
         transY - transY * Math.cos(rotationSpeed));
      drawingContext.rotate(rotationSpeed);
  }
  drawBackground();
  if (showHelpText) {
    drawHelpText();
  }
  if (!useTouch()) {
    drawMouseCursor();
  }
  if (isBonusRound && bonusRoundType == 4) { // gravity
    drawGravityIndicator();
  }
  if (!$.browser.mozilla) {
    drawingContext.setAlpha( gamePaused?.5:1);
  }

  // draw the proportion for each ball, behind balls
  // for ( ballnum in balls) {
  //   drawProp(balls[ballnum].rect, propuncovered);
  // }

  for ( ballnum in balls) {
    balls[ballnum].draw();
  }
  for ( lnum in lines) {
    var line = lines[lnum];
    line.draw();
  }
  if (gamePaused) {
    drawText();
  } else {
    if (isBonusRound && bonusRoundType == 3) { // ninja round
      drawShroud();
    }
  }
  // if (isBonusRound && bonusRoundType == 5) {
  //   // rotationAngle = (rotationAngle + rotationSpeed) % (2 * Math.PI);
  //   // console.log("BOO!");
  //   // drawingContext.translate(gameWidth/2, gameHeight/2);
  //   // drawingContext.rotate(rotationSpeed);''
  // }
}

function drawShroud() {
  var shroudWidth = gameWidth/3, shroudHeight = gameHeight/3;
  drawingContext.strokeStyle = "#FFF";
  drawingContext.fillStyle = "#000";
  drawingContext.beginPath();
  drawingContext.moveTo(0,0);
  drawingContext.lineTo(gameWidth, 0);
  drawingContext.lineTo(gameWidth, gameHeight);
  drawingContext.lineTo(0, gameHeight);
  drawingContext.lineTo(0, 0);

  drawingContext.moveTo(mouseX - shroudWidth/2, mouseY - shroudHeight/2);
  drawingContext.lineTo(mouseX - shroudWidth/2, mouseY + shroudHeight/2);
  drawingContext.lineTo(mouseX + shroudWidth/2, mouseY + shroudHeight/2);
  drawingContext.lineTo(mouseX + shroudWidth/2, mouseY - shroudHeight/2);
  drawingContext.lineTo(mouseX - shroudWidth/2, mouseY - shroudHeight/2);

  // drawingContext.rect(0, 0, gameWidth, gameHeight);
  // drawingContext.rect(mouseX - 25, mouseY - 25, 50, 50);
  drawingContext.closePath();
  drawingContext.fill();
  drawingContext.stroke();
}


function drawGravityIndicator() {
  // drawingContext.strokeStyle = "#AAA";
  var arrowDistLeft = 20, arrowDistDown = 20, arrowHeight = 20, arrowWidth = 10;
  drawingContext.moveTo(gameWidth - arrowDistLeft, arrowDistDown);
  drawingContext.lineTo(gameWidth - arrowDistLeft, arrowDistDown + arrowHeight);
  if (gravityDirection) {
    drawingContext.moveTo(gameWidth - arrowDistLeft + lineWidth/2, arrowDistDown);
    drawingContext.lineTo(gameWidth - arrowDistLeft - arrowWidth, arrowDistDown + arrowWidth);
    drawingContext.moveTo(gameWidth - arrowDistLeft - lineWidth/2, arrowDistDown);
    drawingContext.lineTo(gameWidth - arrowDistLeft + arrowWidth, arrowDistDown + arrowWidth);
  } else {
    drawingContext.moveTo(gameWidth - arrowDistLeft + lineWidth/2, arrowDistDown + arrowHeight);
    drawingContext.lineTo(gameWidth - arrowDistLeft - arrowWidth, arrowDistDown + arrowHeight - arrowWidth);
    drawingContext.moveTo(gameWidth - arrowDistLeft - lineWidth/2, arrowDistDown + arrowHeight);
    drawingContext.lineTo(gameWidth - arrowDistLeft + arrowWidth, arrowDistDown + arrowHeight - arrowWidth);
  }
  // drawingContext.closePath();
  drawingContext.stroke();
}


// draws the lose/win text
function drawText() {
  var font = "sans";
  var fontsize =  gameWidth / 8;
  var y = drawingContext.fontAscent(font, fontsize);
  updateTextColor();
  drawingContext.strokeStyle = "rgba("
    + textColor.toString()+",1)";
  //drawingContext.fillStyle = "rgba(0,0,0,.75)";
  drawingContext.drawTextCenter(font, fontsize, gameWidth/2, y, gameWon?"YOU WIN!!!":"Try again!");
  var subheading = "Awesome game";
  if (isBonusRound) {
    subheading = bonusRoundNames[bonusRoundType];
  } else {
    subheading = (useTouch()? "Tap" : "Click") + " to continue!";
  }
  drawingContext.drawTextCenter(font, fontsize/2, gameWidth/2, y + fontsize, subheading);
  
  //drawingContext.drawTextCenter(font, fontsize, gameWidth/2, y, gameWon?"YOU WIN!!!":"YOU LOSE!!!");
}


// updates the text color for win / lose
function updateTextColor() {
  for (var i = 0; i < textColor.length; i++) {
    textColor[i] = Math.min(
      Math.max(
         Math.round(
              textColor[i]
              +Math.random()*8-4)
         , 0)
      , 255);
  }
}


// draws the proportion left until the next level
function drawProp(rect, propuncovered) {
  var font = "sans",
    fontsize = (rect[2] - rect[0]) / 10,
    prop_till_win = (1-propuncovered)/(1-winProportion);
  drawingContext.strokeStyle = "rgb(" + 
    Math.floor((1 - prop_till_win) * 255) + "," +
    Math.floor(prop_till_win * 255)  +
    ",0)";
  drawingContext.drawTextCenter( font, fontsize,
    (rect[0] + rect[2]) / 2,
    (rect[1] +rect[3]) / 2,
    '' + (prop_till_win*100).toFixed(1)
    + '%');
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
  this.grow = function(timeElapsed) {
    if (this.growing1)
      this.size1 += lineGrowSpeed * timeElapsed;
    if (this.growing2)
      this.size2 += lineGrowSpeed * timeElapsed;
    if  (this.type && (this.x - this.size1 < this.rect[0])) {
      this.growing1 = false;
      this.size1 = this.x - this.rect[0] - 1;
    }
    if (!this.type && (this.y - this.size1 < this.rect[1]) ) {
      this.growing1 = false;
      this.size1 = this.y - this.rect[1] - 1;
      //alert("type:"+this.type+"\nx:"+this.x+"\ny:"+this.y+
      //    "\nsize1:"+this.size1+"\nsize2:"
      //    +this.size2+"\nrect:"+this.rect);
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
  lineGrowSpeed *= .9;
  gamePaused = true;
  var prop_completed = 1 - get_prop_uncovered();
  // increment the score
  score += Math.round(prop_completed * gameLevel * 1000);
  if (isBonusRound) {
    score += 100 * gameLevel;
  }
  updateScore();
  updateLevel();
  tryBonusRound();
  //tryFacebookOpenGraphPost();
  //backgroundImage.src = winImageLocation;
  //initializeGame();
  if (isBonusRound) {
    $('#continuegamebtn').text('BONUS ' + bonusRoundNames[bonusRoundType] + "!");
  } else {
    gameLevel += 1;
    $('#continuegamebtn').text('Continue to level ' + gameLevel);
  }
  $('#fbsharebtnconnect').show();
  $('#fbsharebtnconnectsuccess').hide();
  $('#fbconnecttext').html(getRandomTip());
  try {
    FB.getLoginStatus(function(response) {
      if (response.status === 'connected') {
        $('#fbloginconnect').hide(); // don't need to prompt for a login if already logged in
        makeOpenGraphPost();
      } else {
        // the user isn't logged in to Facebook.
        //facebookLogin();
        $('#fbloginconnect').show();
      }
    });
  } catch(e) {
    console.log("No Facebook.")
    $('#fbloginconnect').show();
  }
  // $('#title').text('' + (canvasMinX + gameWidth/2 - $('#fbconnect').width()/2) + ', ' + (canvasMinY + gameHeight/2 - $('#fbconnect').height()/2))
  $('#fbconnect').css('left', "" + (canvasMinX + gameWidth/2 - $('#fbconnect').width()/2) + "px")
    .css('top', '' + (canvasMinY + gameHeight/2 - $('#fbconnect').height()/2) + 'px')
    .fadeIn();
  

}

function loseGame() {
    lineGrowSpeed += .1;
    gamePaused = true;
    gameWon = false;
    //backgroundImage.src = loseImageLocation;
    //initializeGame();
}

function tryBonusRound() {
  if (!isBonusRound) {
    isBonusRound = true;
    bonusRoundType = 5//Math.floor(bonusRoundNames.length * Math.random());
    makeBonusRound();
  } else {
    revertBonusRoundEffects();
    isBonusRound = false;
  }
}

function revertBonusRoundEffects() {
  if (isBonusRound) {
    // super speed
    if (bonusRoundType == 0) {
      lineGrowSpeed /= 2;
      ballSpeed /= 2.5;
    } else if (bonusRoundType == 3) { // Ninja
      lineGrowSpeed /= 1.5;
    } else if (bonusRoundType == 5) { // Rotation
      var transX = gameWidth/2, transY = gameHeight/2;
      
      drawingContext.translate(transX -  transX * Math.cos(-rotationAngle), 
        - transX * Math.sin(-rotationAngle));
      drawingContext.translate(transY * Math.sin(-rotationAngle), 
         transY - transY * Math.cos(-rotationAngle));
      drawingContext.rotate(-rotationAngle);
    }
  }
}

function makeBonusRound() {
  if (isBonusRound) {
    // super speed
    if (bonusRoundType == 0) {
      lineGrowSpeed *= 2;
      ballSpeed *= 2.5;
    } else if (bonusRoundType == 3) { // Ninja
      lineGrowSpeed *= 1.5;
    } else if (bonusRoundType == 5) { // Rotation
      rotationAngle = 0;
      rotationSpeed = Math.random() * .04 - .02;  
    }
  }
}

function mousedown(evt)
{
  if (initHelpTimer) {
    showHelpText = false;
    clearTimeout(initHelpTimer);
    initHelpTimer = null;
  }
    if (gamePaused) {
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
        if (rect) {
            makeLine(x, y, rect, switchLines ? (2 - type) : type );
        }
        }
    }
    }
}

function mouseup(evt)
{

}

function mousemove(evt)
{
  mouseX = evt.pageX - canvasMinX;
  mouseY = evt.pageY - canvasMinY;
}

function touchstart(evt)
{
  evt.preventDefault();
  if (initHelpTimer) {
    showHelpText = false;
    clearTimeout(initHelpTimer);
    initHelpTimer = null;
  }
  if (evt.targetTouches.length) {
    var touch = evt.targetTouches[0];
    lastTouchX = touch.pageX;
    lastTouchY = touch.pageY ;
  }
}

function preventDefault(evt)
{
  evt.preventDefault();
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
    initializeGame();
    } else {
    if (lastTouchY && lastTouchX && touchX && touchY) {
      var type = (touchX  - lastTouchX) * (touchX  - lastTouchX) > (touchY  - lastTouchY) * (touchY  - lastTouchY) ? 2 : 0;
      var x = (touchX + lastTouchX) / 2  - canvasMinX, y = (touchY + lastTouchY) / 2 - canvasMinY;
      if (!point_inline(x, y)){
        var rect = point_inrect(x, y);
        if (rect)
            makeLine(x, y, rect, type);
        }
        // reset touch variables
      lastTouchX = lastTouchY = touchX = touchY = null;
    }
  }
}

function keydown(evt)
{
  evt = evt || window.event;
  // spacebar
  if (evt.which == 32) {
    switchLines = !switchLines;
    //$('#jezzball_canvas').css('cursor', switchLines? 'e-resize' : 'n-resize')
    evt.preventDefault();
    if (gamePaused) {
      initializeGame();
    }
  }
}

function addRandomBall(rect) {
    var r = Math.random() * 10 + 7.5;
    var width = rect[2] - rect[0], height = rect[3] - rect[1];

    var ball = new Ball(Math.random()*(width - 2 * r)
      + rect[0] + r,
      Math.random() * (height - 2 * r)
      + rect[1] + r,
      r,
      (Math.random() * ballSpeed + 1)*(Math.random() > .5?-1:1),
      (Math.random() * ballSpeed + 1)*(Math.random() > .5?-1:1)  );
    // var ball = new Ball(width/2,
    //   height/2,
    //   r,
    //   0,
    //   0  );
    ball.rect = rect;
    balls.push(ball);
}

function makeLine(x, y, rect, type ){
  if (isBonusRound && bonusRoundType == 1) { // cross beam
    
    lines.push(new Line(x - 1, y, rect, 2));
    lines.push(new Line(x + 1, y, rect, 2));
    lines.push(new Line(x, y - 1, rect, 0));
    lines.push(new Line(x, y + 1, rect, 0));
  } else {
    lines.push(new Line(x, y, rect, type));
    if (isBonusRound && bonusRoundType == 4) { //gravity
      gravityDirection = (1- gravityDirection);//Math.floor(Math.random() * 4);
    }
  }
}

function initializeGame()
{
  gamePaused = false;
  $('#fbconnect').fadeOut();
  // hideLoginButton();
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
  initializeFacebook();
    canvasElement = document.createElement("canvas");
    canvasElement.id = "jezzball_canvas";
    if (useTouch()) {
      gameWidth = Math.min(screen.availWidth, screen.width);
      var titleHeight = $('#titlediv').height(),
      miniTitleHeight = $('#minititle').height();
      gameHeight = Math.min(screen.availHeight, screen.height) - titleHeight - miniTitleHeight;
      $('#minititle_help').css('max-width', '' + gameWidth + 'px');
      $('.mouse_help').hide();
      $('.touch_help').show();
    }

    canvasElement.width = gameWidth;
    canvasElement.height = gameHeight;
    if (!useTouch()) {
      canvasElement.onmousedown = mousedown;
      canvasElement.onmousemove = mousemove;
      // canvasElement is not focusable
      document.onkeydown = keydown;
      $('#canvas').css('margin','10px');
      //setTimeout(addFacebookIntegration, 10);
  } else {
    //document.ontouchstart = document.ontouchmove = document.ontouchend = document.body.ontouchstart = preventDefault;
    canvasElement.ontouchstart = touchstart;
      canvasElement.ontouchmove = touchmove;
      canvasElement.ontouchend = touchend;
      $('#fbsharebtn').height($('#title').height())
      $('#fbsharebtn').css('padding-top', '5px')
      hideAddressBar(); //hide address bar
      //helpToggle();
      // not sure about this if statement, got from internet
   //    if(document.height < window.outerHeight)
    // {
    //  document.body.style.height = (window.outerHeight + 50) + 'px';
    // }
      // try to scroll to it again in half a second
      setTimeout(hideAddressBar, 1000);
      window.addEventListener("orientationchange", hideAddressBar );
      // window.onscroll = function(evt) {
      //  var nVScroll = document.documentElement.scrollTop || document.body.scrollTop || pageYOffset;
      //  //$("#title").text(fbLoggedIn);
      //  console.log(nVScroll);
      //  console.log(gameHeight + $('#title').height());
      //  if ( (nVScroll != gameHeight + $('#title').height() ) &&
      //    (nVScroll != 1)) {
      //    hideAddressBar();
      //  }
      // };
  }
    //canvasElement.onmouseup   = mouseup;
    canvasElement.oncontextmenu="return false;";
    var canvastag = document.getElementById("canvas");
    if (canvastag)
      $(canvastag).append(canvasElement);
    else
  document.body.insertBefore(canvasElement,document.body.childNodes[0]);
    //    document.body.appendChild(canvasElement);
    canvasMinX = canvasElement.offsetLeft;
    canvasMinY = canvasElement.offsetTop;
    //should make sure it's not null. whatever...
  drawingContext = canvasElement.getContext("2d");
    
    CanvasTextFunctions.enable(drawingContext);
    initializeGame();
    window.requestAnimFrame(draw, canvasElement);
    initHelpTimer = setTimeout(function() {
      showHelpText = true;
    }, helpTextTime);
    lastUpdateTime = new Date().getTime(); // set up the initial last time
    return setInterval(update, updateTimer);
}

$(document).ready(function(){
  setTimeout(initialize, 300);
});

function initializeFacebook() {
  window.fbAsyncInit = function() {
        // init the FB JS SDK
        FB.init({
          appId      : '151296288348494', // App ID from the App Dashboard
          channelUrl : 'http://jezzpaul.com/channel.html', // Channel File for x-domain communication
          status     : true, // check the login status upon init?
          cookie     : true, // set sessions cookies to allow your server to access the session?
          xfbml      : true  // parse XFBML tags on this page?
        });

        // Additional initialization code such as adding Event Listeners goes here

      };

      // Load the SDK's source Asynchronously
      (function(d){
         var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
         if (d.getElementById(id)) {return;}
         js = d.createElement('script'); js.id = id; js.async = true;
         js.src = "http://connect.facebook.net/en_US/all.js";
         ref.parentNode.insertBefore(js, ref);
       }(document));
}

function addFacebookIntegration() {
  $('#facebook').html('<div class="fb-like" data-href="http://jezzpaul.com" data-send="false" data-width="450" data-show-faces="true" data-font="arial"></div> ');//\
        // <div> \
        //   <a href="https://twitter.com/share" class="twitter-share-button" data-via="thepaulbooth" data-size="large">Tweet</a> \
        //   <script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src="http://platform.twitter.com/widgets.js";fjs.parentNode.insertBefore(js,fjs);}}(document,"script","twitter-wjs");</script> \
        // </div> '); //\
 //        <!-- Place this tag where you want the +1 button to render. --> \
 //        <div class="g-plusone" data-annotation="inline" data-width="300"></div> \
 // \
 //        <!-- Place this tag after the last +1 button tag. --> \
 //        <script type="text/javascript"> \
 //          (function() { \
 //            var po = document.createElement("script"); po.type = "text/javascript"; po.async = true; \
 //            po.src = "https://apis.google.com/js/plusone.js"; \
 //            var s = document.getElementsByTagName("script")[0]; s.parentNode.insertBefore(po, s); \
 //          })(); \
 //        </script> \
 //        <iframe src="http://www.facebook.com/plugins/likebox.php?href=http%3A%2F%2Fwww.facebook.com%2Fpages%2FJezzPaul%2F118615994880476&amp;width=300&amp;colorscheme=light&amp;show_faces=true&amp;stream=true&amp;header=true&amp;height=427" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:300px; height:427px;" allowTransparency="true"></iframe>');
}

function makeFacebookPost(image_url) {
  if (!image_url) {
    image_url = 'http://catsinsinks.com/images/cats/rotator.php?'+Math.random();
  }
  FB.ui(
    {
     method: 'feed',
     name: 'JezzPaul',
     caption: 'The best new casual game. I just reached level ' + gameLevel + 
        " with a score of OVER " + (score - 1) + "!",
     description: (
        'Addictively fun, quick game where you trap balls by making ' +
        'lines that block out areas and reveal the random picture ' +
        'of cats in sinks. All your friends play it.'
     ),
     link: 'http://jezzpaul.com',
     picture: image_url
    },
    function(response) {
      if (response && response.post_id) {
        //alert('Post was published.');
        lineGrowSpeed += 1;
        $('#fbsharebtnconnect').hide();
        $('#fbsharebtnconnectsuccess').show();
      } else {
        //alert('Post was not published.');
      }
    }
  );
}

function makeOpenGraphPost()
  {
      FB.api(
        '/me/jezzpaul:reach',
        'post',
        { level: 'http://og.jezzpaul.com:3333/' + gameLevel + (isBonusRound ? " Bonus": "") + '?score=' + score},
        function(response) {
           if (!response || response.error) {
              //alert('Error occured');
              console.log("OG error")
           } else {
              console.log('Reach was successful! Action ID: ' + response.id);
           }
        });
  }

function tryFacebookOpenGraphPost() {
  FB.getLoginStatus(function(response) {
    if (response.status === 'connected') {
      // the user is logged in and has authenticated your
      // app, and response.authResponse supplies
      // the user's ID, a valid access token, a signed
      // request, and the time the access token 
      // and signed request each expire
      // var uid = response.authResponse.userID;
      // var accessToken = response.authResponse.accessToken;
      console.log("connected user");
      makeOpenGraphPost();
    } else if (response.status === 'not_authorized') {
      // the user is logged in to Facebook, 
      // but has not authenticated your app
      //facebookLogin();
      // showLoginButton();
    } else {
      // the user isn't logged in to Facebook.
      //facebookLogin();
      // showLoginButton();
    }
  });
}

function facebookLogin() {
    FB.login(function(response) {
        if (response.authResponse) {
            // connected
            lineGrowSpeed += 1.5;
            $('#fbloginconnect').hide();
        $('#fbloginconnectsuccess').show();
        setTimeout(function() {
          $('#fbloginconnectsuccess').hide();
        }, 3000);
        } else {
            // cancelled
        }
    });
}

function showLoginButton() {
  //var titleHeight = $('#title').height();
  console.log('showing');

  $('#fbloginbutton').css('left', "" + (gameWidth/2 - 100 + 10) + "px").css('top', '' + (gameHeight/2 - 45) + 'px').show();
}

function hideLoginButton() {
  $('#fbloginbutton').hide();
}

function facebookLoginCallback() {
  console.log('called back!');
  hideLoginButton();
  tryFacebookOpenGraphPost();
}

function continueGame() {
  initializeGame();
}

function getRandomTip() {   
  var tips = ['For the love of cats, share this with your friends. And enemies.',
    'It\'s always a random picture, but always of a cat. In a sink.',
    'If you need help, there is a help button! Find it. Live your dreams.',
    'If you have feedback, please tweet at @jezzpaul',
    'We have a Facebook Page! Good luck finding it!',
    'Have you tried the mobile version? It works sometimes!',
    'Who could you beat at JezzPaul?',
    'Did you notice the BONUS LEVELS!?',
    'Wow! You got to level ' + gameLevel + '? Big shot!',
    'The balls keep bouncing. Back and forth. Forever.',
    'Try to split up the balls. Divide and conquer.',
    'I accept <u><a href="http://twitter.com/thepaulbooth" class="darklink">pity follows</a></u>.',
    'Have you tried <u><a href="http://gunnerrunner.com" class="darklink">Gunner Runner</a></u>?',
    'You can get on the leaderboard with your score of ' + score + ' by connecting to Facebook.',
    'Try spacebar to change line orientation. The lines can go in either direction.'];
  return tips[Math.floor(Math.random() * tips.length)];
}

// toggles showing the help info
function helpToggle() {
  var $help = $('#help');
  if ($help.is(":hidden")) {
    $help.fadeIn();
  } else {
    $help.fadeOut();
  }
  if (useTouch()) {
    if ($('#help').is(":visible")) {
      //console.log("scrolling to:" + (gameHeight + $('#title').height()) )
      //window.scrollTo(0, gameHeight + $('#title').height())
      //$("#help").animate({ scrollTop: $('#canvas').height()}, 1000);
      $('#bottom_content').css('max-width', '' + gameWidth + 'px')
        .css('position', 'absolute')
        .css('top', '' + (gameHeight/2 - $('#bottom_content').height()/2 + $('#titlediv').height()) + 'px')
        .css('left', '' + (gameWidth/2 - $('#bottom_content').width()/2) + 'px');
    } else {
      //window.scrollTo(0,1)
        $('#bottom_content').css('max-width', '' + gameWidth + 'px')
        .css('position', 'absolute')
        .css('top', '' + ($('#jezzball_canvas').position().top + gameHeight) + 'px')
        .css('left', '' + (gameWidth/2 - $('#bottom_content').width()/2) + 'px');
    }
  }
}

function updateScore() {
  $('#score').text(score);
}

function updateLevel() {
  $('#level').text(gameLevel + ( isBonusRound? " BONUS": "" ));
}

// hides the address bar on mobile by scrolling to 0,1
function hideAddressBar() {
  window.scrollTo(0, 1); //hide address bar
}

// tells you whether there is touch capabilities
// detects mobile or iPad
function useTouch() {
  return $.browser.mobile || navigator.userAgent.match(/iPad/i) != null 
}