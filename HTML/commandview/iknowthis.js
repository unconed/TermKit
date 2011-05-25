///////////////////////////////////////////////////////////////////////////////

$(function () {
  
  var $items = $('div.widgetFile');
  setInterval(function () {
    $items = $('div.widgetFile');
    console.log('icons', $items.length);
    
    $items.each(function () {
      if (this.style.WebkitTransform == '') {
        var offset = $(this).offset();
        console.log('offset', offset);
        this.style.left = offset.left + 'px';
        this.style.top = offset.top + 'px';
      }
    });

    $('div.widgetList:not(.processed)').addClass('processed').css({
      height: '500px',
      WebkitTransformStyle: 'preserve-3d',
      WebkitPerspective: '800px',
    });
  }, 1000);
  
  setInterval(function () {
    var t = +new Date() * .001;
    
    var i = 0, sd = 123;
    $items.each(function () {
      sd = (sd * 121 + 331) % 1000;
      var k = sd / 1000;
      
      var r = (k + t * .5) * 180,
          s = Math.sin(k + t * .331) * 30;
          z = Math.cos((Math.cos(k)*.1 + .5) * t + k) * 400;

      r = r % 360;
      if (r > 180) {
        r = r - 180;
        s = -s;
      }
      r = r - 90;
      
      $(this).css({
        position: 'absolute',
        WebkitTransform: 'translateZ('+ z + 'px) rotateY('+ r + 'deg) rotateX('+ s +'deg)'
      });
    });
  }, 1000 / 30);
});

