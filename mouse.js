let mousex = 0;
let mousey = 0;
let originx = 0;
let originy = 0;
let changex = 0;
let changey = 0;

let mousedown = false;
window.addEventListener("mousemove", e => {
    mousex = e.clientX;
    mousey = e.clientY;

    if (!mousedown) return;

    changex = mousex - originx;
    changey = mousey - originy;
});

window.addEventListener("mousedown", () => {
    mousedown = true; 
    originx = mousex;
    originy = mousey;
});
window.addEventListener("mouseup", () => {
    mousedown = false; 
    camx += changex;
    camy += changey;
    changex = 0;
    changey = 0;
});

window.addEventListener("keypress", e => {
    switch (e.key) {
        case "1": {
            DEBUGTYPE = 0;
            break;
        }
        case "2": {
            DEBUGTYPE = 1;
            break;
        }
        case "3": {
            DEBUGTYPE = 2;
            break;
        }
    }
})