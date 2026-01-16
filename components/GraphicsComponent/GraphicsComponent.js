class CustomGraphics extends HTMLElement {

  // A utility function for creating a new html element with given id and class
  static newElement(tag, id, clsName) {
    const elem = document.createElement(tag);
    elem.className = clsName;
    elem.id = id;
    return elem;
  }

  constructor() {
    // Always call super first in constructor
    super();
    
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseLeftDown = 0;
    this.mouseRightDown = 0;
    this.lastTime = performance.now() / 1000;
    this.frame = 0;
    this.triggerClear = true;
    
    // get access to the DOM tree for this element
    const shadow = this.attachShadow({mode: 'open'});

    // Apply customGraphics external stylesheet to the shadow dom
    const styleLinkElem = document.createElement('link');
    styleLinkElem.setAttribute('rel', 'stylesheet');
    styleLinkElem.setAttribute('href', 'components/GraphicsComponent/GraphicsComponent.css');

    // we also want prism.css stylesheet for syntax highlighting shader code
    const prismStyleLinkElem = document.createElement('link');
    prismStyleLinkElem.setAttribute('rel', 'stylesheet');
    prismStyleLinkElem.setAttribute('href', 'components/GraphicsComponent/lib/prism.css'); 

    // Attach the created elements to the shadow dom
    shadow.appendChild(styleLinkElem);
    shadow.appendChild(prismStyleLinkElem);

    // load opengl matrix library
    const glScriptElem = document.createElement('script');
    glScriptElem.setAttribute('src', 'components/GraphicsComponent/lib/gl-matrix.js');
    shadow.appendChild(glScriptElem);

    // and load prism syntax highlighting library
    const prismScriptElem = document.createElement('script');
    prismScriptElem.setAttribute('src', 'components/GraphicsComponent/lib/prism.js');
    shadow.appendChild(prismScriptElem);

    // create a top level full width strip to hold the component
    this.mainStrip = CustomGraphics.newElement('div', 'customGraphicsMainStrip', 'custom-graphics main-strip vertical-panel');
    shadow.appendChild(this.mainStrip);

    // expand/collapse component
    this.titlePanel = CustomGraphics.newElement('div', 'customGraphicsTitlePanel', 'title-panel-collapsed horizontal-panel');
    this.mainStrip.appendChild(this.titlePanel);

    this.expandCollapseButton = CustomGraphics.newElement('button', 'customGraphicsExpandCollapseButton', 'expand-collapse-button collapsed');
    this.expandCollapseButton.innerHTML = "+";
    this.titlePanel.appendChild(this.expandCollapseButton);

    this.mainLabel = CustomGraphics.newElement('div', 'CustomGraphicsMainLabel', 'custom-graphics-label');
    this.mainLabel.innerHTML = "Graphics";
    this.titlePanel.appendChild(this.mainLabel);

    // Allow the graphics panel to be fullscreen
    this.fullscreenButton = CustomGraphics.newElement('button', 'CustomGraphicsFullscreenButton', 'fullscreen-button');
    this.fullscreenButton.innerHTML = "Fullscreen";
    this.fullscreenButton.style.display = "none";
    this.titlePanel.appendChild(this.fullscreenButton);
    this.fullscreenButton.addEventListener('click', async (event) => {
      try {
        let res = await this.canvas.requestFullscreen();
        console.log(res);
      } catch(e) {
        console.error(e);
      }
    });

    this.expandCollapseButton.addEventListener('click', (event) => {
      if (this.mainPanel.style.visibility !== 'visible') {
        this.mainPanel.style.visibility = 'visible';
        this.expandCollapseButton.innerHTML = "-";
        this.expandCollapseButton.classList.remove('collapsed');
        this.expandCollapseButton.classList.add('expanded');
        this.titlePanel.classList.remove('title-panel-collapsed');
        this.titlePanel.classList.add('title-panel-expanded');
        this.fullscreenButton.style.display = "inline-block";
      } else {
        this.mainPanel.style.visibility = 'collapse';
        this.expandCollapseButton.innerHTML = "+";
        this.expandCollapseButton.classList.remove('expanded');
        this.expandCollapseButton.classList.add('collapsed');
        this.titlePanel.classList.remove('title-panel-expanded');
        this.titlePanel.classList.add('title-panel-collapsed');
        this.fullscreenButton.style.display = "none";
      }
    });

    // Create a top level panel, that need not be full width
    this.mainPanel = CustomGraphics.newElement('div', 'customGraphicsMainPanel', 'custom-graphics graphics-panel vertical-panel');
    this.mainPanel.style.visibility = 'collapse';
    this.mainStrip.appendChild(this.mainPanel);

    this.canvas = CustomGraphics.newElement('canvas', 'customGraphicsCanvas', 'custom-graphics-canvas');
    this.mainPanel.appendChild(this.canvas);
    this.canvas.addEventListener('mousemove', this.setMousePosition.bind(this));
    this.canvas.addEventListener('mousedown', this.setMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.setMouseUp.bind(this));
    this.canvas.addEventListener('mouseenter', this.onMouseEnter.bind(this));

    this.canvas.addEventListener('fullscreenchange',(event) => {
      console.log(`Canvas is now fullscreen, and drawing buffer is ${this.canvas.width} by ${this.canvas.height}`)
    });
    this.gl = this.canvas.getContext('webgl2');

    this.canvasControls = CustomGraphics.newElement('div', 'customGraphicsControls', 'custom-graphics-panel horizontal-panel');
    this.mainPanel.appendChild(this.canvasControls);

    this.canvasPlayButton = CustomGraphics.newElement('button', 'customGraphicsCanvasRun', 'play-button toggled-off');
    this.canvasControls.appendChild(this.canvasPlayButton);
    this.canvasPlayButton.innerHTML = "Play";
    this.canvasPlayButton.addEventListener('click', (event) => {
      if (!this.running) { 
        this.running = true;
        requestAnimationFrame(this.render.bind(this));

        this.canvasPlayButton.innerHTML = "Pause";
        this.canvasPlayButton.classList.remove('toggled-off');
        this.canvasPlayButton.classList.add('toggled-on');
         
      } else {
        this.running = false;

        this.canvasPlayButton.innerHTML = "Play";
        this.canvasPlayButton.classList.remove('toggled-on');
        this.canvasPlayButton.classList.add('toggled-off');
      }
    });

    this.canvasClearButton = CustomGraphics.newElement('button', 'customGraphicsCanvasClear', 'clear-button');
    this.canvasControls.appendChild(this.canvasClearButton);
    this.canvasClearButton.innerHTML = "Clear";
    this.canvasClearButton.addEventListener('click', (event) => {
      this.mouseX = 0;
      this.mouseY = 0;
      this.mouseDownLeft = 0;
      this.mouseDownRight = 0;
      this.triggerClear = true;
    });

    this.copyCodeButton = CustomGraphics.newElement('button', 'customGraphicsCopyButton', 'copy-button');
    this.copyCodeButton.innerHTML = "Copy from Clipboard";
    this.canvasControls.appendChild(this.copyCodeButton);
    this.copyCodeButton.addEventListener('click', async (event) => {
      const strCode = await navigator.clipboard.readText();
      // check that this looks like valid shaderToy code, with a mainImage function
      if (!strCode.match(/void\s+mainImage/)) {
        alert("The clipboard doesn't appear to have a valid shadertoy program in it");
        return;
      }
      this.setShaderToySource(strCode);
    });

    this.showCodeButton = CustomGraphics.newElement('button', 'customGraphicsShowCodeButton', 'show-button toggled-off');
    this.showCodeButton.innerHTML = "Show code";
    this.canvasControls.appendChild(this.showCodeButton);

    // Prism syntax highlighting prefers code to be in a <pre><code> ... </code></pre> context
    this.shaderToyCodePre = CustomGraphics.newElement('pre', 'customGraphicsCodePre', 'custom-graphics-code-pre language-glsl');
    this.mainPanel.appendChild(this.shaderToyCodePre);

    this.shaderToyCode = CustomGraphics.newElement('code', 'customGraphicsCode', 'custom-graphics-code language-glsl');
    this.shaderToyCodePre.appendChild(this.shaderToyCode);

    // hide code by default
    this.shaderToyCodePre.style.visibility = 'collapse';
    
    // show hide the code with the showCodeButton
    this.showCodeButton.addEventListener('click', (event) => {
      if (this.shaderToyCodePre.style.visibility !== 'visible') {
        this.shaderToyCodePre.style.visibility = 'visible';
        this.showCodeButton.innerHTML = "Hide code";
        this.showCodeButton.classList.remove('toggled-off');
        this.showCodeButton.classList.add('toggled-on');
      } else {
        this.shaderToyCodePre.style.visibility = 'collapse';
        this.showCodeButton.innerHTML = "Show code";
        this.showCodeButton.classList.remove('toggled-on');
        this.showCodeButton.classList.add('toggled-off');
      }
    });

    // setup opengl stuff
    this.buffers = this.initCanvasBuffers(this.gl);

    // setup default shaders
    // Vertex shader program for spectrogram. This does nothing but pass directly through
    // All the interesting stuff happens in the fragment shader
    this.vsSource = `# version 300 es
    in vec4 aVertexPosition;
    in vec2 aTextureCoord;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    out highp vec2 vTextureCoord;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      vTextureCoord = aTextureCoord;
    }
    `;

    // Fragment shader program
    this.fsPrefix = `# version 300 es
    precision highp float;
    in highp vec2 vTextureCoord;

    uniform vec3 iResolution;
    uniform float iTime;
    uniform float iTimeDelta;
    uniform int iFrame;
    uniform float iFrameRate;
    uniform vec4 iDate;
    uniform vec4 iMouse;
  
    `

    let shaderToySource = `
const float PI = 3.14159265359;
const vec2 CA = vec2(-0.200,-0.380);
const vec2 CB = vec2(-0.610,0.635);
vec2 CC = vec2(-0.440,0.170);
const vec2 CD = vec2(0.170,-0.10); 
const float C=1.5; 
const float C2=23.7; 
const vec3 Color = vec3(0.450,0.513,1.000);
const float Speed = 2.;
#ifdef AUDIO
float iAudio = 0.;
#else
const float iAudio = .15;
#endif

// Complex functions
vec2 cis(in float a){ return vec2(cos(a), sin(a));}
vec2 cMul(in vec2 a, in vec2 b) { return vec2( a.x*b.x - a.y*b.y, a.x*b.y + a.y * b.x);}
vec2 cDiv(in vec2 a, in vec2 b) { return vec2(a.x*b.x + a.y*b.y, a.y*b.x - a.x*b.y) / (b.x*b.x+b.y*b.y); }
vec2 cLog(in vec2 a){ return vec2(log(length(a)),atan(a.y,a.x)); }
void fill(inout float[9] k){for( int i=0;i<8;i++) { k[i] = 0.;} }
// Elliptic J function calculation ported from d3
// https://github.com/d3/d3-geo-projection/blob/master/src/elliptic.js
vec4 ellipticJ(float u, float m){
    float ai, b=sqrt(1.-m), phi, t, twon=1.;
    float a[9],c[9];
    fill(a); fill(c);
	a[0] = 1.; c[0] = sqrt(m);
    int i=0;
    for (int j=1;j<8;j++){
        if ((c[j-1] / a[j-1]) > 0.1) {
            i++;
            ai = a[j-1];
            c[j] = (ai - b) * .5;
            a[j] = (ai + b) * .5;
            b = sqrt(ai * b);
            twon *= 2.;
        }
    }
    for (int j=8;j>0;j--){
        if (j == i) phi = twon * a[j] * u;
        if (j <= i){
            t = c[j] * sin(b = phi) / a[j];
            phi = (asin(t) + phi) / 2.;
        }
    }
    return vec4(sin(phi), t = cos(phi), t / cos(phi - b), phi);
}
// Jacobi's cn tiles the plane with a sphere 
vec2 cn(vec2 z, float m) {
    vec4 a = ellipticJ(z.x, m), b = ellipticJ(z.y, 1. - m);
    return vec2(a[1] * b[1] , -a[0] * a[2] * b[0] * b[2] )/ (b[1] * b[1] + m * a[0] * a[0] * b[0] * b[0]);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
vec3 domain(vec2 z){
    return vec3(hsv2rgb(vec3(atan(z.y,z.x)/PI*8.+1.224+(iMouse.y/iResolution.y),1.,1.)));
}
// A Julia fractal, but with a Mobius transformation instead of a translation
vec3 M(vec2 z,vec2 c){
    vec3 mean;
    float ci;
    int k=0;
	vec3 color;
    for ( int i=0; i<50;i++){
        z = cMul(z,z);
        z = cDiv(cMul(CA,z)+CB+cis(iTime)*(iMouse.x / iResolution.x),cMul(z,CC)+CD);          
        if (i < 3) continue;
	 	mean += length(z);
        float amount = pow(7./float(i),2.608);
        color = (1.-amount)*color+amount*length(z)*domain(z);
        k++;
    }
	mean /= float(k-3);
    // Hacky color time!
	ci =  log2(C2*log2(length(mean/C)));
	ci = max(0.,ci);
    vec3 color2 = .5+.5*cos(ci + Color)+.3;
	color = color2*(color);
    
    return color;
}
vec3 color(vec2 z){
    z = cLog(z) * 1.179;
    z.x -= mod(iTime/float(Speed),1.)*3.7;
    z *= mat2(1,-1,1,1);
    z = cn(z,0.5);
    return M(z,z);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    #ifdef AUDIO
    iAudio = texture(iChannel0, vec2(0.1, 0.)).r;
    iAudio = pow(iAudio,4.);
	#endif
    vec2 uv = (fragCoord.xy-0.5*iResolution.xy) / iResolution.y;
	fragColor = vec4(color(uv),1.0);
}

    `;
    
    this.fsPostfix = `
    
    out vec4 fragColor;
    void main() {
      mainImage(fragColor, gl_FragCoord.xy);
    }
    `;

    this.setShaderToySource(shaderToySource);
  
  
    // Fragment shader for second pass (re-render from offscreen buffer to screen quad)
    this.secondPassFS = `# version 300 es
    precision highp float;
    in highp vec2 vTextureCoord;
    uniform sampler2D sTexture;

    out vec4 fragColor;
    void main() {
      fragColor = texture(sTexture, vTextureCoord);
    }
    `
  
    this.setShaderToySecondPassSource();

  }

  // mouse tracking in the graphics canvas - only if the left mouse button is down
  setMousePosition(e) {
    if (this.mouseLeftDown) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = rect.height - (e.clientY - rect.top) - 1;  // bottom is 0 in WebGL
    }
  }

  setMouseDown(e) {
    if (e.button == 0) { 
      this.mouseLeftDown = 1; 
      this.setMousePosition(e);
    }
    if (e.button == 2) { this.mouseRightDown = 1; }    
  }

  setMouseUp(e) {
    if (e.button == 0) { this.mouseLeftDown = 0; }
    if (e.button == 2) { this.mouseRightDown = 0; }    
  }

  onMouseEnter(e) {
    if (e.buttons == 1) { this.mouseLeftDown = 1; } else { this.mouseLeftDown = 0; }
    if (e.buttons == 2) { this.mouseRightDown = 1; } else { this.mouseRightDown = 0; }
  }

  // convert tilt values into mouseX mouseY
  receiveTiltPitch(val) {
    // Pitch values go from -180 to 180, with 0 being flat upright (these are degrees)
    // Map pitch to the mouseY with 0 degrees being in the centre
    const rect = this.canvas.getBoundingClientRect();
    const halfwayUp = rect.bottom - rect.height / 2; // DOMRects are upside down
    const r = Math.max(Math.min(val, 90), -90) / 90;
    this.mouseY = halfwayUp - r * rect.height / 2;
  } 

  // convert tilt values into mouseX mouseY
  receiveTiltRoll(val) {
    // Roll values go from -180 to 180, with 0 being flat upright (these are degrees)
    // Map roll to the mouseX with 0 degrees being in the centre
    const rect = this.canvas.getBoundingClientRect();
    const halfwayAcross = rect.left + rect.width / 2;
    const r = Math.max(Math.min(val, 90), -90) / 90;
    this.mouseX = halfwayAcross + r * rect.width / 2;
  } 
  
  // also convert knobs 0 and 1 into mouseX mouseY
  receiveKnob0(val) {
    const rect = this.canvas.getBoundingClientRect();
    //const halfwayAcross = rect.left + rect.width / 2;
    const r = val / 1023;
    this.mouseX = r * rect.width;
  }

  receiveKnob1(val) {
    const rect = this.canvas.getBoundingClientRect();
    // const halfwayUp = rect.bottom - rect.height / 2; 
    const r = val / 1023;
    this.mouseY = rect.height * (1 - r); // DOMRects are upside down
  }


  handleSerialMessage(val) {
      const pitchMatch = val.match(/Pitch ([-]?\d+)/);
      if (pitchMatch && pitchMatch.length == 2) {
          this.receiveTiltPitch(parseInt(pitchMatch[1]));
      }
      const rollMatch = val.match(/Roll ([-]?\d+)/);
      if (rollMatch && rollMatch.length == 2) {
          this.receiveTiltRoll(parseInt(rollMatch[1]));
      }
      const knobMatch = val.match(/Knob (\d+) (\d+)/);
      if (knobMatch && knobMatch.length == 3) {
          const knobNum = parseInt(knobMatch[1]);
          const knobVal = parseInt(knobMatch[2]);
          if (knobNum == 0) {
              this.receiveKnob0(knobVal);
          }
          if (knobNum == 1) {
              this.receiveKnob1(knobVal);
          }
      }
  }

  // Combines the copy/pasted code from shaderToy into our proper fragment shader
  combineFragmentShaderSources() {
    this.fsSource = this.fsPrefix + this.shaderToySource + this.fsPostfix;
  }
  
  // sets the shadertoy source in our fragment shader program, and also in the code display
  setShaderToySource(srcString) {
    this.shaderToySource = srcString;
    this.shaderToyCode.innerHTML = srcString.replace(/&/g, "&amp").replace(/</g, "&lt").replace(/>/g, "&gt");
    this.combineFragmentShaderSources();
    this.shaderProgram = this.initShaderProgram(this.gl, this.vsSource, this.fsSource);
    
    this.programInfo = {
      program: this.shaderProgram,
      attribLocations: {
        vertexPosition: this.gl.getAttribLocation(this.shaderProgram, 'aVertexPosition'),
        textureCoord: this.gl.getAttribLocation(this.shaderProgram, 'aTextureCoord'),
      },
      uniformLocations: {
        projectionMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uProjectionMatrix'),
        modelViewMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uModelViewMatrix'),
        resolution: this.gl.getUniformLocation(this.shaderProgram, "iResolution"),
        time: this.gl.getUniformLocation(this.shaderProgram, "iTime"),
        timeDelta: this.gl.getUniformLocation(this.shaderProgram, "iTimeDelta"),
        frame: this.gl.getUniformLocation(this.shaderProgram, "iFrame"),
        frameDelta: this.gl.getUniformLocation(this.shaderProgram, "iFrameDelta"),
        mouse: this.gl.getUniformLocation(this.shaderProgram, "iMouse"),
        date: this.gl.getUniformLocation(this.shaderProgram, "iDate"),        
      },
    }; 
  }


  setShaderToySecondPassSource() {
    this.secondPassShaderProgram = this.initShaderProgram(this.gl, this.vsSource, this.secondPassFS);
    
    this.secondPassProgramInfo = {
      program: this.secondPassShaderProgram,
      attribLocations: {
        vertexPosition: this.gl.getAttribLocation(this.secondPassShaderProgram, 'aVertexPosition'),
        textureCoord: this.gl.getAttribLocation(this.secondPassShaderProgram, 'aTextureCoord'),
      },
      uniformLocations: {
        projectionMatrix: this.gl.getUniformLocation(this.secondPassShaderProgram, 'uProjectionMatrix'),
        modelViewMatrix: this.gl.getUniformLocation(this.secondPassShaderProgram, 'uModelViewMatrix'),
        backingTexture: this.gl.getUniformLocation(this.secondPassShaderProgram, 'uTexture'),
      },
    }; 
  }

  
  initialiseBackingBuffer(gl, width, height) {
      // We will render in two passes. First pass renders to an offscreen buffer
      this.backingBuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.backingBuffer);    
      this.backingTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.backingTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      // gl.bindTexture(gl.TEXTURE_2D, null);
  
      // attach it to currently bound framebuffer object
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.backingTexture, 0);
  
      // create a renderbuffer object for the depth and stencil testing for our backing buffer
      this.backingDepthAndStencilBuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.backingDepthAndStencilBuffer); 
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, width, height);  
      // gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  
      if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
        console.log("Framebuffer is not complete");
      }
      // rebind the default framebuffer (ie the canvas output)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  
  
  initCanvasBuffers(gl) {

    // Create a buffer for the square's positions.
    const positionBuffer = gl.createBuffer();
  
    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  
    // Now create an array of positions for the square.
    const positions = [
      -1.0, -1.0,
       1.0, -1.0,
       1.0,  1.0,
      -1.0,  1.0,
    ];
  
    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  
    // Create the texture coordinates
    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
  
    const textureCoordinates = [
      // Front
      0.0,  0.0,
      1.0,  0.0,
      1.0,  1.0,
      0.0,  1.0,
    ];
  
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
  
    // Build the element array buffer; this specifies the indices
    // into the vertex arrays for each face's vertices.
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  
    // This array defines each face as two triangles, using the
    // indices into the vertex array to specify each triangle's
    // position.
    const indices = [
      0,  1,  2,      0,  2,  3,
    ];
  
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  
    // setup backing buffer for offscreen rendering
    this.initialiseBackingBuffer(gl, gl.canvas.width, gl.canvas.height);

    return {
      position: positionBuffer,
      textureCoord: textureCoordBuffer,
      indices: indexBuffer
    };
  }
  

  initTexture(gl) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  width, height, border, srcFormat, srcType,
                  pixel);
  
    // Turn off mips and set  wrapping to clamp to edge so it
    // will work regardless of the dimensions of the video.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  
    return texture;
  }
  

  updateTextureFromImage(gl, texture, image) {
    const level = 0;
    const internalFormat = gl.RGBA;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    //gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  srcFormat, srcType, image);
  }
  
  
  zeroTexture(gl, texture) {
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const blackPixel = new Uint8Array([0, 0, 0, 0]);  // transparent black
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  width, height, border, srcFormat, srcType,
                  blackPixel);
  }
  

  // Main drawing routine for the video display
  render( time ) {
    const gl = this.gl;
    this.resizeCanvasToDisplaySize(this.canvas, gl);
  
    time *= 0.001
    const timeDelta = time - this.lastTime;
    this.lastTime = time;
    this.frame++;
    const frameRate = 1 / timeDelta;
    const today = new Date();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const projectionMatrix = mat4.create();

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = mat4.create();

    // Now move the drawing position a bit to where we want to
    // start drawing the square.
    // mat4.translate(modelViewMatrix,     // destination matrix
    //                modelViewMatrix,     // matrix to translate
    //                [poi.x, poi.y, -0.0]);

    // mat4.scale(modelViewMatrix,
    //            modelViewMatrix,
    //             [zoom, zoom, 1.0]);

    // mat4.translate(modelViewMatrix,     // destination matrix
    //                modelViewMatrix,     // matrix to translate
    //                [-1 * poi.x, -1 * poi.y, -0.0]);  // amount to translate


    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    {
      const numComponents = 2;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
      gl.vertexAttribPointer(
      this.programInfo.attribLocations.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset);
      gl.enableVertexAttribArray(
      this.programInfo.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the texture coordinates from
    // the texture coordinate buffer into the textureCoord attribute.
    {
      const numComponents = 2;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.textureCoord);
      gl.vertexAttribPointer(
      this.programInfo.attribLocations.textureCoord,
      numComponents,
      type,
      normalize,
      stride,
      offset);
      gl.enableVertexAttribArray(
      this.programInfo.attribLocations.textureCoord);
    }

    // Tell WebGL which indices to use to index the vertices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);

    // ---- First pass - render into offscreen buffer ---- //
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.backingBuffer);
    gl.useProgram(this.programInfo.program);

    // Set the shader uniforms
    gl.uniformMatrix4fv(
      this.programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);

    gl.uniformMatrix4fv(
      this.programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix);

    // Specify the texture to map onto the canvas.
    // We will store the experience image in texture unit 0
    // gl.activeTexture(gl.TEXTURE0);
    // gl.bindTexture(gl.TEXTURE_2D, experienceTexture);
    // gl.uniform1i(programInfo.uniformLocations.experienceImage, 0);

    // and the countdown in texture unit 1
    // gl.activeTexture(gl.TEXTURE0 + 1);
    // gl.bindTexture(gl.TEXTURE_2D, countdownTexture);
    
    gl.uniform3f(this.programInfo.uniformLocations.resolution, gl.canvas.width, gl.canvas.height, 1);
    gl.uniform1f(this.programInfo.uniformLocations.time, time);
    gl.uniform1f(this.programInfo.uniformLocations.timeDelta, timeDelta);
    gl.uniform1i(this.programInfo.uniformLocations.frame, this.frame);
    gl.uniform1f(this.programInfo.uniformLocations.frame, frameRate);
    gl.uniform4f(this.programInfo.uniformLocations.mouse, this.mouseX, this.mouseY, this.mouseLeftDown, this.mouseRightDown);
    gl.uniform4f(this.programInfo.uniformLocations.date, today.getFullYear(), today.getMonth(), today.getDay(), today.getSeconds());

    if (this.triggerClear) {
      this.triggerClear = false;
      gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
      gl.clearDepth(1.0);                 // Clear everything
      gl.enable(gl.DEPTH_TEST);           // Enable depth testing
      gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    
    { // process the textures into the quad
      const type = gl.UNSIGNED_SHORT;
      const offset = 0;
      const vertexCount = 6;
      gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }


    // second pass -- render from the backingTexture to the screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(this.secondPassProgramInfo.program);

    // Set the shader uniforms
    gl.uniformMatrix4fv(
      this.secondPassProgramInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);

    gl.uniformMatrix4fv(
      this.secondPassProgramInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix);

    // Specify the texture to map onto the canvas.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.backingTexture);
    gl.uniform1i(this.secondPassProgramInfo.uniformLocations.backingTexture, 0);

    { // process the textures into the quad
      const type = gl.UNSIGNED_SHORT;
      const offset = 0;
      const vertexCount = 6;
      gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }


    if (this.running) { 
      requestAnimationFrame(this.render.bind(this));
    }

  }

  
  loadShader(gl, type, source) {
    const shader = gl.createShader(type);
  
    // Send the source to the shader object
    gl.shaderSource(shader, source);
  
    // Compile the shader program
    gl.compileShader(shader);
  
    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
  
    return shader;
  }
  
  
  initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  
    // Create the shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
  
    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
      return null;
    }
  
    return shaderProgram;
  }

  
  resizeCanvasToDisplaySize(canvas, gl) {
    // Lookup the size the browser is displaying the canvas in CSS pixels.
    const displayWidth  = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
   
    // Check if the canvas is not the same size.
    const needResize = canvas.width  !== displayWidth ||
                       canvas.height !== displayHeight;
   
    if (needResize) {
      // Make the canvas the same size
      canvas.width  = displayWidth;
      canvas.height = displayHeight;
    
      this.initialiseBackingBuffer(gl, displayWidth, displayHeight);
    }
   
    return needResize;
  }
  
}


customElements.define('custom-graphics', CustomGraphics);
