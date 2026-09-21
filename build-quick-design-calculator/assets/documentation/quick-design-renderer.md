---
id: quick-design-renderer
title: Renderer File
noIndex: true
---

The renderer.js file allows you to include the SkyCiv Renderer in your calculator. The renderer will become visible after you have included this file. Like the ui.js file it is updated every time the user changes and input or solves. Please refer to the [SKYCIV.renderer](https://skyciv.com/api/v3/docs/s3d-renderer-core) documentation for help configuring the renderer.

### Template

```js
    var viewer = SKYCIV_DESIGN.ui.getRendererViewer();

    var input = SKYCIV_DESIGN.generateInput()
    var a = input.a;
    var b = input.b;

    var s3d_model = {};

    viewer.model.set(s3d_model);
    viewer.model.buildStructure();

    viewer.render();
    viewer.refresh();
```

:::tip
The renderer has already been initialized for you. To retrieve the viewer object please use `SKYCIV_DESIGN.ui.getRendererViewer();`.
:::