/**
 * Lab — builds the five experiment panels and their tabs. Arrow keys move
 * between tabs; the experiments listen for "labtab" to resize once visible.
 */
(() => {
  'use strict';
  /* the experiments' tabs, stages and controls (static markup; each lab-*.js brings its panel to life) */
  const host = document.getElementById('labPanels');
  if (host) host.outerHTML = `
  <div class="lab-tabs" role="tablist" aria-label="Experiments">
    <button type="button" role="tab" id="labTabNn" aria-controls="lab-nn" aria-selected="true"><i class="mono">01</i><b>Deep learning</b><small class="mono">train a neural network</small></button>
    <button type="button" role="tab" id="labTabGen" aria-controls="lab-gen" aria-selected="false" tabindex="-1"><i class="mono">02</i><b>Generative AI</b><small class="mono">sample a language model</small></button>
    <button type="button" role="tab" id="labTabCv" aria-controls="lab-cv" aria-selected="false" tabindex="-1"><i class="mono">03</i><b>Computer vision</b><small class="mono">see like a CNN</small></button>
    <button type="button" role="tab" id="labTabDg" aria-controls="lab-dg" aria-selected="false" tabindex="-1"><i class="mono">04</i><b>Handwriting</b><small class="mono">a real digit reader</small></button>
    <button type="button" role="tab" id="labTabWd" aria-controls="lab-wd" aria-selected="false" tabindex="-1"><i class="mono">05</i><b>Embeddings</b><small class="mono">word maths on a map</small></button>
  </div>
  <div class="lab-panel" id="lab-nn" role="tabpanel" aria-labelledby="labTabNn">
    <div class="lab-stage nn-stage">
      <canvas id="nnPlot" role="img" aria-label="A neural network's decision boundary, learning live"></canvas>
      <p class="lab-hud mono"><span>step <b id="nnStep">0</b></span><span>loss <b id="nnLoss">—</b></span><span>accuracy <b id="nnAcc">—</b></span></p>
    </div>
    <div class="lab-side">
      <canvas class="nn-net" id="nnNet" aria-hidden="true"></canvas>
      <div class="lab-row mono"><span>data</span><button type="button" data-set="spiral" aria-pressed="true">spiral</button><button type="button" data-set="circles" aria-pressed="false">circles</button><button type="button" data-set="xor" aria-pressed="false">xor</button><button type="button" data-set="moons" aria-pressed="false">moons</button></div>
      <div class="lab-row mono"><span>learning rate</span><button type="button" data-lr="0.003" aria-pressed="false">.003</button><button type="button" data-lr="0.01" aria-pressed="true">.01</button><button type="button" data-lr="0.03" aria-pressed="false">.03</button><button type="button" data-lr="0.1" aria-pressed="false">.1</button></div>
      <div class="lab-row mono"><span>click adds</span><button type="button" data-cls="1" aria-pressed="true"><i class="sw a"></i>class A</button><button type="button" data-cls="0" aria-pressed="false"><i class="sw b"></i>class B</button></div>
      <div class="lab-row mono"><button type="button" class="go" data-nn="play">❚❚ pause</button><button type="button" data-nn="reset">↺ new weights</button></div>
      <p class="lab-note">A 2-16-16-1 network — tanh units, a sigmoid out, Adam on the full batch — written from scratch. Each square on the right is one neuron, drawn as what it fires for across the plane; the links show the sign and size of every weight. Click the plot to add points.</p>
    </div>
  </div>

  <div class="lab-panel" id="lab-gen" role="tabpanel" aria-labelledby="labTabGen" hidden>
    <div class="lab-stage gen-stage">
      <p class="gen-k mono">context → next token</p>
      <p class="gen-text" id="genText" aria-live="polite"></p>
      <div class="gen-dist" id="genDist" aria-label="Next-token probabilities"></div>
      <p class="lab-hud mono"><span>p = softmax(logits / T), then top-p</span><span>entropy <b id="genH">—</b> bits</span></p>
    </div>
    <div class="lab-side">
      <label class="lab-range mono"><span>temperature <b id="genTv">0.80</b></span><input type="range" id="genT" min="0.1" max="2" step="0.05" value="0.8"></label>
      <label class="lab-range mono"><span>top-p <b id="genPv">0.90</b></span><input type="range" id="genP" min="0.1" max="1" step="0.01" value="0.9"></label>
      <div class="lab-row mono"><button type="button" class="go" data-gen="step">next token</button><button type="button" data-gen="auto">▶ generate</button><button type="button" data-gen="new">↺ new prompt</button></div>
      <p class="lab-note">A word-level trigram model, trained in your browser on thirty sentences about my work. A tiny brain — but the sampling is the same maths an LLM uses: low temperature plays it safe, high temperature gets creative, top-p cuts the long tail. Greyed-out tokens fall outside the nucleus.</p>
    </div>
  </div>

  <div class="lab-panel" id="lab-cv" role="tabpanel" aria-labelledby="labTabCv" hidden>
    <div class="lab-stage cv-stage">
      <div class="cv-in"><canvas id="cvIn" width="96" height="96" role="img" aria-label="A 96 by 96 pixel input you can draw on"></canvas><i class="cv-lens" id="cvLens"></i></div>
      <p class="lab-hud mono" id="cvEq">hover the input to see one convolution worked out</p>
    </div>
    <div class="lab-side">
      <div class="cv-maps" id="cvMaps"></div>
      <div class="lab-row mono"><span>input</span><button type="button" data-cv="eye">eye</button><button type="button" data-cv="leaf">leaf</button><button type="button" data-cv="seven">7</button><button type="button" data-cv="grid">checker</button><button type="button" data-cv="clear">clear &amp; draw</button></div>
      <p class="lab-note">Draw on the input. Four 3×3 kernels slide across it, ReLU keeps what fires, 2×2 max-pooling shrinks each map and global average pooling turns it into one score — the first steps of every CNN, from my leaf-disease detector to YOLO.</p>
    </div>
  </div>

  <div class="lab-panel" id="lab-dg" role="tabpanel" aria-labelledby="labTabDg" hidden>
    <div class="lab-stage dg-stage">
      <canvas id="dgIn" width="280" height="280" role="img" aria-label="Draw a digit from 0 to 9"></canvas>
      <p class="lab-hud mono"><span>draw one digit, 0–9, big and centred</span><button type="button" data-dg="clear">clear</button></p>
    </div>
    <div class="lab-side">
      <div class="dg-top"><p class="dg-guess"><span class="mono">it reads</span><b id="dgGuess">?</b><em class="mono" id="dgConf">waiting for ink</em></p><p class="dg-seen"><span class="mono">what it sees · 8×8</span><canvas id="dgSeen" width="8" height="8"></canvas></p></div>
      <div class="dg-bars" id="dgBars"></div>
      <p class="lab-note">A 64-64-10 network I trained on 1,797 real handwritten digits (UCI optdigits, via scikit-learn) — 98% on digits it never saw. Your drawing is cropped, scaled and pooled to 8×8 exactly like its training data, then read in your browser.</p>
    </div>
  </div>

  <div class="lab-panel" id="lab-wd" role="tabpanel" aria-labelledby="labTabWd" hidden>
    <div class="lab-stage wd-stage">
      <svg id="wdMap" viewBox="0 0 600 600" role="img" aria-label="A map of word meanings"></svg>
      <p class="lab-hud mono" id="wdHud">drag a word into the equation · hover a word to see its neighbours</p>
    </div>
    <div class="lab-side">
      <div class="wd-eq"><button type="button" class="wd-slot" data-slot="0">king</button><i>−</i><button type="button" class="wd-slot" data-slot="1">man</button><i>+</i><button type="button" class="wd-slot" data-slot="2">woman</button><i>=</i><b id="wdOut">?</b></div>
      <div class="wd-res" id="wdRes"></div>
      <div class="lab-row mono"><span>try</span><button type="button" data-wd="king man woman">king − man + woman</button><button type="button" data-wd="paris france italy">paris − france + italy</button><button type="button" data-wd="walking walk swim">walking − walk + swim</button><button type="button" data-wd="puppy dog cat">puppy − dog + cat</button><button type="button" data-wd="bigger big small">bigger − big + small</button></div>
      <p class="lab-note">Real embeddings: the 384-dimensional token vectors of all-MiniLM-L6-v2 (Apache-2.0), cut to 64 dimensions, for 125 words. Meaning becomes direction — “king” minus “man” plus “woman” lands nearest “queen”. The map is a t-SNE projection; the maths happens in the full space.</p>
    </div>
  </div>`;
  /* tabs, bound per tablist so separate groups (the lab, the arcade) never hide each other's panels */
  const bind = list => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const show = (t, focus) => {
      tabs.forEach(x => {
        const on = x === t, p = document.getElementById(x.getAttribute('aria-controls'));
        x.setAttribute('aria-selected', String(on));
        x.tabIndex = on ? 0 : -1;
        if (p) p.hidden = !on;
      });
      if (focus) t.focus();
      dispatchEvent(new CustomEvent('labtab', { detail: t.getAttribute('aria-controls') }));
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(t));
      t.addEventListener('keydown', e => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); show(tabs[(i + d + tabs.length) % tabs.length], true); }
      });
    });
  };
  (window.MA = window.MA || {}).bindTabs = bind;
  document.querySelectorAll('.lab-tabs').forEach(bind);
})();
