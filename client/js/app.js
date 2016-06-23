$(function () {

  // Utility

  var util = {};

  util.dirname = function (path, withDilimiter) {
    path = String(path);
    var index = path.lastIndexOf('/');
    return path.slice(0, index + (withDilimiter ? 1 : 0));
  }

  util.basename = function (path, suffix) {
    path = String(path);
    suffix = String(suffix);
    var index = path.lastIndexOf('/');
    var filename = path.slice(index + 1);
    var suffixIndex = filename.indexOf(suffix);
    return suffixIndex > -1 ? filename.slice(0, suffixIndex) : filename;
  }

  util.extname = function (path) {
    path = String(path);
    var index = path.lastIndexOf('.');
    return path.slice(index);
  }

  // App

  var canvas = $('#canvas')[0];
  var layer = new Layer(canvas);

  var imageList = {
    root: '/imgSrc/',
    files: [],
    loadFileList: function () {
      var that = this;
      return $.getJSON('/files', function (files) {
        if (files && files.length) {
          that.files = files.map(function (file, index ) {
            file._index = index;
            return file;
          });
        } else {
          that.files = [];
        }
      });
    }
  };

  function setNavbtnState(name) {
    var files = imageList.files;
    var index = -1;

    for (var i = 0; i < files.length; i++) {
      if (files[i].name === name) {
        index = i;
        break;
      }
    }

    var $menuForm = $('#menu-form');
    var $prevBtn = $menuForm.find('button.prev');
    var $nextBtn = $menuForm.find('button.next');

    if (index > 0) {
      $prevBtn.prop('disabled', false);
      $prevBtn.data('image-name', files[index - 1].name);
    } else {
      $prevBtn.prop('disabled', true);
    }

    if (index < files.length - 1) {
      $nextBtn.prop('disabled', false);
      $nextBtn.data('image-name', files[index + 1].name);
    } else {
      $nextBtn.prop('disabled', true);
    }
  }

  function clearImgSrc() {
    vex.dialog.confirm({
      message: 'Confirm to clear the "imgSrc" directory?',
      callback: function (value) {
        if (value) {
          $.ajax({
            url: '/clearImgSrc',
            success: function (res) {
              toastr.success('', 'Clear all done', {
                timeOut: 2500,
                positionClass: 'toast-bottom-right'
              });
              $('#menu-form button').prop('disabled', true);
              layer.clear();
              page('/');
            },
            error: function (xhr) {
              toastr.error('', 'Failed in clearing', {
                positionClass: 'toast-bottom-right'
              });
            }
          });
        }
      }
    });
  }

  function prevImage(name) {
    var name = $('#menu-form button.prev').data('image-name');
    page('/image/' + name);
  }

  function nextImage() {
    var name = $('#menu-form button.next').data('image-name');
    page('/image/' + name);
  }

  function saveImage() {
    var filename = $(this).data('image-name');
    layer.canvas.toBlob(function (blob) {
      var file = new File([blob], filename);
      var data = new FormData();

      data.append(util.basename(filename, '.jpg'), file);

      $.ajax({
        type: 'POST',
        url: '/upload',
        data: data,
        cache: false,
        dataType: 'json',
        processData: false,
        contentType: false,
        success: function (res) {
          toastr.success('', 'Save the image successfully.', {
            timeOut: 2500,
            positionClass: 'toast-bottom-right'
          });
          var $nextBtn = $('#menu-form button.next');
          if (!$nextBtn.prop('disabled')) {
            $nextBtn.click();
          }
        },
        error: function (xhr) {
          toastr.error('', 'Failed in saving the image.', {
            positionClass: 'toast-bottom-right'
          });
        }
      });
    }, 'image/jpeg', 1);
  }

  function loadImage() {
    var name = $('#menu-form button.reload').data('image-name');
    var filename = imageList.root + name;
    layer.loadImage(filename, function (err, image) {
      var $menuForm = $('#menu-form');
      var $buttons = $menuForm.find('button.clearImgSrc, button.reload, button.start, button.save');
      if (err) {
        $buttons.prop('disabled', true);
        throw new Error('Load image error:' + err);
      } else {
        $buttons.prop('disabled', false);
      }
    });
  }

  function bindEvents() {
    var $menuForm = $('#menu-form');
    $menuForm.off('.image')
      .on('click.image', '.clearImgSrc', clearImgSrc)
      .on('click.image', '.reload', loadImage)
      .on('click.image', '.prev', prevImage)
      .on('click.image', '.next', nextImage)
      .on('click.image', '.start', function () {
        layer.centerAndScale();
      })
      .on('click.image', '.save', saveImage);
  }

  function index() {
    imageList.loadFileList().then(function () {
      var files = imageList.files;
      console.log(files);

      if (files && files.length > 0) {
        page('/image/' + util.basename(files[0].name));
      }
    });
  }

  function image(ctx, next) {
    var name = ctx.params.name;
    var $menuForm = $('#menu-form');

    $menuForm.find('button.reload, button.save').data('image-name', name);

    imageList.loadFileList().then(function () {
      setNavbtnState(name);
      loadImage();
      bindEvents();
    });
  }

  // Router

  page('/', index);
  page('/image/:name', image);
  page();
});