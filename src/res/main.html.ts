export const template = (options: { host: string}) => {
  const { host } = options;
  return `<!doctype html>
<html lang="en-us">
  <head>
    <meta charset="utf-8">
    <title>VGG</title>
    <style>
      body { margin: 0; background-color: gray; }
      canvas.emscripten {
        position: absolute; /* important! */
        top: 0px;
        left: 0px;
        margin: 0px;
        border: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: block;
        background-color: black;
      }
    </style>
  </head>
  <body>
    <canvas class="emscripten" id="canvas" oncontextmenu="event.preventDefault()"></canvas>
    <input type="file" id="imageInput" accept="image/*" style="display:none" onchange="openImage(this.files)" />
    <input type="file" id="fontInput" accept=".ttf,.ttc,.otf" style="display:none" onchange="openFont(this.files)" />
    <script type="text/javascript" src="${host}/cloudeditor/main.js"></script>
    <script type="text/javascript">
      const hookFileAPIs = (Module) => {
        window.openImage = function(files) {
          console.log("openImage...");
          if (files.length > 0) {
            var file = files[0];
            console.log(file.name + ": size = " + file.size);

            var reader = new FileReader();
            reader.onload = function(e) {
              var res = false;
              if (reader.result)
              {
                var data = new Uint8Array(reader.result);
                var buf = Module["_malloc"](data.length);
                Module.writeArrayToMemory(data, buf);

                var stack = Module.stackSave();
                var strlen = (file.name.length << 2) + 1;
                var ret = Module.stackAlloc(strlen);
                Module.stringToUTF8(file.name, ret, strlen);
                res = Boolean(Module["_load_image_from_mem"](ret, buf, data.length));

                Module.stackRestore(stack);
              }
              if (!res)
              {
                alert("Failed to load image:", file.name);
              }
            };
            reader.readAsArrayBuffer(file);
          }
        }
        window.openFont = function(files) {
          console.log("openFont...");
          if (files.length > 0) {
            var file = files[0];
            console.log(file.name + ": size = " + file.size);

            var reader = new FileReader();
            reader.onload = function(e) {
              var res = false;
              if (reader.result)
              {
                var data = new Uint8Array(reader.result);
                var buf = Module["_malloc"](data.length);
                Module.writeArrayToMemory(data, buf);
                res = Boolean(Module["_load_font_from_mem"](buf, data.length));
              }
              if (!res)
              {
                alert("Failed to load font:", file.name);
              }
            };
            reader.readAsArrayBuffer(file);
          }
        }
      };
      createModule({
        locateFile: (path) => {
          return "${host}/cloudeditor/" + path;
        },
        canvas: (function() {
          var canvas = document.getElementById("canvas");
          return canvas;
        })(),
      }).then((Module) => {
        window.Module = Module;
        hookFileAPIs(Module);
        window.addEventListener('message', event => {
          const msg = event.data;
          switch (msg.command) {
            case "saveEntityCode":
              Module.ccall("save_entity_code", "void", ["number", "string"], [msg.entityID, msg.content]);
              return;
          }
        });
        Module.ccall("set_requests_host", "void", ["string"], ["${host}"]);
      });
    </script>
  </body>
</html>`;
};
