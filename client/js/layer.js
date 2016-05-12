;(function () {

  /* Utility functions
   * =================
  */

  var util = {};

  //name: Hermite resize
  //about: Fast image resize/resample using Hermite filter with JavaScript.
  //author: ViliusL
  //demo: http://viliusle.github.io/miniPaint/
  util.resample_hermite = function (canvas, W, H, W2, H2){
    W2 = Math.round(W2);
    H2 = Math.round(H2);

    var img = canvas.getContext("2d").getImageData(0, 0, W, H);
    var img2 = canvas.getContext("2d").getImageData(0, 0, W2, H2);
    var data = img.data;
    var data2 = img2.data;
    var ratio_w = W / W2;
    var ratio_h = H / H2;
    var ratio_w_half = Math.ceil(ratio_w / 2);
    var ratio_h_half = Math.ceil(ratio_h / 2);
    
    for (var j = 0; j < H2; j++) {
      for (var i = 0; i < W2; i++) {
        var x2 = (i + j * W2) * 4;
        var weight = 0;
        var weights = 0;
        var weights_alpha = 0;
        var gx_r = gx_g = gx_b = gx_a = 0;
        var center_y = (j + 0.5) * ratio_h;

        for (var yy = Math.floor(j * ratio_h); yy < (j + 1) * ratio_h; yy++) {
          var dy = Math.abs(center_y - (yy + 0.5)) / ratio_h_half;
          var center_x = (i + 0.5) * ratio_w;
          var w0 = dy * dy //pre-calc part of w

          for (var xx = Math.floor(i * ratio_w); xx < (i + 1) * ratio_w; xx++) {
            var dx = Math.abs(center_x - (xx + 0.5)) / ratio_w_half;
            var w = Math.sqrt(w0 + dx * dx);

            if (w >= -1 && w <= 1) {
              //hermite filter
              weight = 2 * w * w * w - 3 * w * w + 1;

              if (weight > 0) {
                dx = 4*(xx + yy*W);
                //alpha
                gx_a += weight * data[dx + 3];
                weights_alpha += weight;
                //colors
                if (data[dx + 3] < 255) {
                  weight = weight * data[dx + 3] / 250;
                }
                gx_r += weight * data[dx];
                gx_g += weight * data[dx + 1];
                gx_b += weight * data[dx + 2];
                weights += weight;
              }
            }
          }   
        }
        data2[x2] = gx_r / weights;
        data2[x2 + 1] = gx_g / weights;
        data2[x2 + 2] = gx_b / weights;
        data2[x2 + 3] = gx_a / weights_alpha;
      }
    }

    canvas.getContext("2d").clearRect(0, 0, Math.max(W, W2), Math.max(H, H2));
    canvas.width = W2;
    canvas.height = H2;
    canvas.getContext("2d").putImageData(img2, 0, 0);
  }

  util.isSameColor = function (color1, color2, delta) {
    return Math.abs(color1.r - color2.r) <= delta &&
      Math.abs(color1.g - color2.g) <= delta &&
      Math.abs(color1.b - color2.b) <= delta;
  };

  util.pixelToRgb = function (pixels, index) {
    return {
      r: pixels[index],
      g: pixels[index + 1],
      b: pixels[index + 2]
    };
  };

  /* Layer
   * =====
  */

  function Layer(canvas, options) {
    options = options || {};
    var that = this;
    this.options = options;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    if (options.width != null) {
      this.width = canvas.width = options.width;
    }
    if (options.height != null) {
      this.height = canvas.height = options.height;
    }

    if (options.src) {
      this.loadImage(options.src, function (err, img) {
        if (!err) {
          options.onLoadImage && options.onLoadImage.call(that, img);
        }
      });
    }
  }

  Layer.prototype.loadImage = function (src, cb) {
    var that = this;
    var ctx = this.ctx;
    var img = new Image();
    img.src = src;
    img.addEventListener('load', function () {
      that.width = that.canvas.width = img.width;
      that.height = that.canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);
      cb(null, img);
    }, false);
    img.addEventListener('error', function (event) {
      cb('Load image failed');
    });
  };

  Layer.prototype.move = function (x, y) {
    var tmpCanvas = document.createElement('canvas');
    var tmpCtx = tmpCanvas.getContext('2d');
    var w = this.canvas.width;
    var h = this.canvas.height;

    tmpCanvas.width = w;
    tmpCanvas.height = h;

    tmpCtx.imageSmoothingEnabled = false;
    tmpCtx.drawImage(canvas, 0, 0, w, h);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(tmpCanvas, x, y, w, h);
  };

  Layer.prototype.scale = function(rx, ry) {
    if (rx == null) return;
    if (ry == null) ry = rx;

    var tmpCanvas = document.createElement('canvas');
    var tmpCtx = tmpCanvas.getContext('2d');
    var w = this.canvas.width;
    var h = this.canvas.height;
    var deltaX = (1 - rx) * w;
    var deltaY = (1 - ry) * h;

    tmpCanvas.width = w;
    tmpCanvas.height = h;

    tmpCtx.drawImage(canvas, 0, 0, w, h);
    util.resample_hermite(tmpCanvas, w, h, w * rx, h * ry);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.drawImage(tmpCanvas, 0, 0, w * rx, h * ry, deltaX / 2, deltaY / 2, w - deltaX, h - deltaY);
  };

  Layer.prototype.imageRect = function () {
    var w = this.width;
    var h = this.height;
    var cols = w;
    var rows = h;
    var imageData = this.ctx.getImageData(0, 0, cols, rows);
    var data = imageData.data;
    var rect = {
      width: w,
      height: h,
      top: 0,
      right: h - 1,
      bottom: w - 1,
      left: 0,
      cx: w / 2,
      cy: h / 2
    };

    var isBreak = false;

    for (var row = 0; row < rows; row++) {
      var lastColor;

      for (var col = 0; col < cols; col++) {
        var index = row * cols * 4 + col * 4;
        var rgb = util.pixelToRgb(data, index);

        if (col === 0) lastColor = rgb;

        if (!util.isSameColor(rgb, lastColor, 5)) {
          isBreak = true;
          rect.top = row;
          break;
        }
      }

      if (isBreak) break;
    }

    isBreak = false;

    for (var row = rows - 1; row >= 0; row--) {
      var lastColor;

      for (var col = 0; col < cols; col++) {
        var index = row * cols * 4 + col * 4;
        var rgb = util.pixelToRgb(data, index);

        if (col === 0) lastColor = rgb;

        if (!util.isSameColor(rgb, lastColor, 5)) {
          isBreak = true;
          rect.bottom = row;
          break;
        }
      }

      if (isBreak) break;
    }

    isBreak = false;

    for (var col = 0; col < cols; col++) {
      var lastColor;

      for (var row = 0; row < rows; row++) {
        var index = row * cols * 4 + col * 4;
        var rgb = util.pixelToRgb(data, index);

        if (row === 0) lastColor = rgb;

        if (!util.isSameColor(rgb, lastColor, 5)) {
          isBreak = true;
          rect.left = col;
          break;
        }
      }

      if (isBreak) break;
    }

    isBreak = false;

    for (var col = cols - 1; col >= 0; col--) {
      var lastColor;

      for (var row = 0; row < rows; row++) {
        var index = row * cols * 4 + col * 4;
        var rgb = util.pixelToRgb(data, index);

        if (row === 0) lastColor = rgb;

        if (!util.isSameColor(rgb, lastColor, 5)) {
          isBreak = true;
          rect.right = col;
          break;
        }
      }

      if (isBreak) break;
    }

    rect.width = rect.right - rect.left;
    rect.height = rect.bottom - rect.top;
    rect.cx = rect.width / 2 + rect.left;
    rect.cy = rect.height / 2 + rect.top;

    return rect;
  };

  Layer.prototype.centerAndScale = function () {
    var minFactor = 0.7;
    var centerPoint = {
      x: this.width / 2,
      y: this.height / 2
    };
    var imgRect = this.imageRect();

    this.move(centerPoint.x - imgRect.cx, centerPoint.y - imgRect.cy);

    var ratio;
    var actualRatio;

    if (imgRect.width > imgRect.height) {
      ratio = imgRect.width / imgRect.height;
      actualRatio = imgRect.width / this.width;
    } else if (imgRect.width < imgRect.height) {
      ratio = imgRect.height / imgRect.width;
      actualRatio = imgRect.height / this.height;
    } else {
      ratio = 1;
      actualRatio = imgRect.width / this.width;
    }

    ratio = Math.min(ratio, 4);

    var expectRatio = minFactor + Math.pow(ratio - 1, 1/3) * 0.075;
    var factor = expectRatio / actualRatio;

    this.scale(factor);
  };

  window.Layer = Layer;

})();