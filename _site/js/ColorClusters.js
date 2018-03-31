var ColorClusters = function( element_id, points_json, points_only ) {

  this.isInitialized = false;
  this.renderer = null;
  this.scene = null;
  this.rings_scene = null;
  this.camera = null;
  this.points = null;
  this.rings_group = null;
  this.lines_group = null;
  this.controls = null;

  var scope = this;

  this.render = function() {

    var time = Date.now() * 0.001;

    if (scope.rings_group != null) {
      for (var i=0; i<scope.rings_group.children.length; ++i) {
        scope.rings_group.children[i].quaternion.copy(
          scope.camera.quaternion );
      }
    }

    scope.renderer.clear();
    scope.renderer.render( scope.scene, scope.camera );
    scope.renderer.render( scope.rings_scene, scope.camera );

  }

  this.animate = function() {

    if (scope.controls.autoRotate) {
      scope.controls.update();
      requestAnimationFrame(scope.animate);
    }
    
  }

  this.haltAnimation = function() {

    scope.controls.autoRotate = false;

  }
  
  this.onLoad = function( response ) {
    
    response = JSON.parse(response);

    var positions = new Float32Array( response.positions );
    var colors = new Float32Array( response.colors );

    positions = new THREE.BufferAttribute(positions, 3);
    colors = new THREE.BufferAttribute( colors, 3 );
    
    var point_geometry = new THREE.BufferGeometry();

    point_geometry.addAttribute( 'position', positions );
    point_geometry.addAttribute( 'color', colors );
    point_geometry.setDrawRange( response.points_start,
                                 response.points_count );
    
    point_geometry.computeBoundingSphere();

    var sprite = new THREE.TextureLoader().load(
      "/images/noteshrink/flatdisc.png",
      function() { scope.render(); } );

    var size, sizeAttenuation;

    if (scope.camera instanceof THREE.PerspectiveCamera) {
      size = 0.08;
      sizeAttenuation = true;
    } else {
      size = 7;
      sizeAttenuation = false;
    }
    
    var point_material = new THREE.PointsMaterial( {
      size: size,
      vertexColors: THREE.VertexColors,
      sizeAttenuation: sizeAttenuation,
      map: sprite,
      alphaTest: 0.5,
      transparent: true,
      fog:false } );
    
    scope.points = new THREE.Points( point_geometry, point_material );

    scope.scene.add( scope.points );

    scope.lines_group = new THREE.Group();
    scope.rings_group = new THREE.Group();

    scope.scene.add(scope.lines_group);
    scope.rings_scene.add(scope.rings_group);
    
    for (var i=0; i<response.segments.length; ++i) {

      var line_geometry = new THREE.BufferGeometry();
      line_geometry.addAttribute('position', positions);
      
      var radius = response.radii[i];

      var line_indices = new Uint16Array( response.segments[i] );
      line_indices = new THREE.BufferAttribute( line_indices, 1 );
      
      line_geometry.setIndex( line_indices );

      var color = new THREE.Color( response.colors[3*i+0],
                                   response.colors[3*i+1],
                                   response.colors[3*i+2] ).getHex();
      
      var line_material = new THREE.LineBasicMaterial({
        color: color,
        linewidth: 1.0 });

      var segments = new THREE.LineSegments(line_geometry, line_material);

      scope.lines_group.add(segments);
      
      var ring_positions = [];

      var ncircle = 64;

      var center = new THREE.Vector3( response.positions[3*i+0],
                                      response.positions[3*i+1],
                                      response.positions[3*i+2] );

      for (var j=0; j<=ncircle; ++j) {
        var theta = j*2.0*Math.PI/ncircle;
        ring_positions.push( radius*Math.cos(theta) );
        ring_positions.push( radius*Math.sin(theta) );
        ring_positions.push( 0.0 );
      }

      ring_positions = new Float32Array(ring_positions);
      ring_positions = new THREE.BufferAttribute( ring_positions, 3 );

      var ring_geometry = new THREE.BufferGeometry();

      ring_geometry.addAttribute( 'position', ring_positions );
      ring_geometry.computeBoundingSphere();

      var ring_material = new THREE.LineBasicMaterial({
        color: color,
        opacity: 0.25,
        transparent: true,
        linewidth: 3.0 });
      
      var ring = new THREE.Line(ring_geometry, ring_material);

      ring.position.add(center);

      scope.rings_group.add(ring);
      
    }

    isInitialized = true;
    
    scope.render();
    
  }

  this.onError = function( event ) {
    console.log('XHRLoader error:');
    console.log(event);
  }

  this.onKeyDown = function( event ) {

    switch (event.key.toLowerCase()) {
    case "a":
      scope.controls.autoRotate = !scope.controls.autoRotate;
      if (scope.controls.autoRotate) {
        scope.animate();
      }
      break;
    case "r":

      scope.controls.reset();
      scope.controls.autoRotate = false;
      if (!scope.rings_group.visible &&
          !scope.points.visible &&
          !scope.lines_group.visible) {
        scope.rings_group.visible = true;
        scope.points.visible = true;
        scope.lines_group.visible = true;
      }

      break;
    case "c":
      scope.rings_group.visible = !scope.rings_group.visible;
      break;
    case "p":
      scope.points.visible = !scope.points.visible;
      break;
    case "l":
      scope.lines_group.visible = !scope.lines_group.visible;
      break;
    }

    scope.render();
    
  }

  if (!Detector.webgl) {
    return;
  }

  var replace_me = document.getElementById(element_id);

  
  var canvas = document.createElement("canvas");
  canvas.setAttribute("id", element_id);

  if (replace_me.hasAttribute("class")) {
    canvas.setAttribute("class", replace_me.getAttribute("class"));
  }
  
  


  replace_me.parentNode.replaceChild(canvas, replace_me);


  var caption = document.createElement("span");
  caption.setAttribute("class", "caption");

  var make_link = function(id, key) {
    return '<a href="#" id="' + element_id + '_' + id + '"><code>' + key + '</code></a>';
  }

  var html_str = 'Interactive 3D plot powered by ' +
      '<a href="http://threejs.org/">three.js</a>. Click and drag to rotate; ' +
      make_link("animate", "a") + '&nbsp;' +
      'toggles spinning animation, ' +
      make_link("rotate", "r") + '&nbsp;' +
      'resets rotation. '

  if (!points_only) {
    html_str += 'Use ' + make_link("points", "p") + ',&nbsp;' +
      make_link("circles", "c") + ',&nbsp;and&nbsp;' +
      make_link("lines", "l") + 'to toggle visibility of ' +
      'points, circles, and lines.';
  }
  
  caption.innerHTML = html_str;

  var link_key = function(id, key) {
    var a = caption.querySelector('#' + element_id + '_' + id);
    a.onclick = function() {
      scope.onKeyDown({key: key});
      return false;
    }
  }

  link_key("animate", "a");
  link_key("rotate", "r");

  if (!points_only) {
    link_key("points", "p");
    link_key("circles", "c");
    link_key("lines", "l");
  }  
    
  var canvas_p = canvas.parentNode;

  canvas_p.insertBefore(caption, canvas.nextSibling);
  
  scope.renderer = new THREE.WebGLRenderer( {
    antialias: true,
    canvas: canvas } );
  
  scope.renderer.setClearColor( 0xffffff );
  scope.renderer.setPixelRatio( window.devicePixelRatio );
  scope.renderer.setSize( canvas.clientWidth, canvas.clientHeight );
  scope.renderer.autoClear = false;

  scope.scene = new THREE.Scene();
  scope.rings_scene = new THREE.Scene();
  
  var aspect = canvas.clientWidth * 1.0 / canvas.clientHeight;
  
  scope.camera = new THREE.PerspectiveCamera( 45, aspect, 0.1, 100 );
  scope.camera.position.z = 2.75;
  
  scope.controls = new THREE.OrbitControls(scope.camera,
                                           scope.renderer.domElement);
  
  scope.controls.addEventListener('change', scope.render);
  scope.controls.autoRotateSpeed = 6.0;
  scope.controls.enablePan = false;
  scope.controls.enableZoom = false;

  window.addEventListener('keydown', scope.onKeyDown, false);

  var loader = new THREE.XHRLoader();
  loader.load(points_json, scope.onLoad, undefined, scope.onError);

  scope.render();

}


