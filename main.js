const canvas = document.getElementById("canvas");
const c = canvas.getContext("2d");

const screensize = { x: window.innerWidth, y: window.innerHeight };
canvas.width = screensize.x;
canvas.height = screensize.y;

const positions = [];
const velocities = [];

const timescale = 0.01;

// PERFORMANCE
const topcellsize = 200;
const minsize = 20; // smallest size a leaf node can be
const codist = 5; // smaller number = more accurate, bigger number = less accurate

let DEBUGTYPE = 0; // 0: off, 1: quadtree visualized, 2: nodes visualized in force calculations

let camx = 0;
let camy = 0;

function createvector(x, y) {
    return { x: x, y: y };
}

function addvectors(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
}

for (let i = 0; i < 60000; i++) {
    positions.push(createvector(Math.random() * screensize.x, Math.random() * screensize.y));
    //velocities.push(createvector(Math.random() * 4 - 2, Math.random() * 4 - 2));
    velocities.push(createvector(0, 0));
}

const distsizes = []; // precalculated values using codist
let distance = topcellsize * 2;
while (distance >= minsize) {
    distance /= 2;
    distsizes[distance] = (distance ** 2) * codist;
} 

class zero { // you might think this is a joke, but its actually not :)
    calculateforce() {
        return [0, 0];
    }
}

let grid = [];
class quadtree {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.s = size;
        this.hs = size / 2;
        this.points = [];
        this.subcells = []; // four quadrants
        this.sprouted = false;

        this.avgx = 0;
        this.avgy = 0;
        if (DEBUGTYPE === 1) {
            if (size === topcellsize) {
                c.strokeStyle = "rgb(0, 255, 0)";
            } else {
                c.strokeStyle = "rgba(100, 100, 255, 0.2)";
            }

            c.beginPath();
            c.strokeRect(x + camx + changex, y + camy + changey, size, size);
        }
    }
    
    allocatepoint(pos) {
        if (pos.x > this.x + this.hs) {
            if (pos.y > this.y + this.hs) {
                this.subcells[3].addpoint(pos); // bottom right is fourth quadrant
            } else {
                this.subcells[0].addpoint(pos); // top right is first quadrant
            }
        } else {
            if (pos.y > this.y + this.hs) {
                this.subcells[2].addpoint(pos); // bottom left is third quadrant
            } else {
                this.subcells[1].addpoint(pos); // top left is second quadrant
            }
        }
    }

    addpoint(pos) {
        const points = this.points;
        points.push(pos);

        this.avgx += pos.x;
        this.avgy += pos.y;

        if (this.s < minsize) return;

        if (points.length > 1) {
            const hs = this.hs;

            if (this.sprouted === false) {
                this.subcells[3] = new quadtree(this.x + hs, this.y + hs, hs);
                this.subcells[2] = new quadtree(this.x, this.y + hs, hs);
                this.subcells[0] = new quadtree(this.x + hs, this.y, hs);
                this.subcells[1] = new quadtree(this.x, this.y, hs);
                this.sprouted = true;

                for (let i = 0; i < points.length; i++) {
                    this.allocatepoint(points[i]);
                }
                return;
            }

            this.allocatepoint(pos);
        }
    }

    finalizecell() {
        this.avgx /= this.points.length; // center of mass
        this.avgy /= this.points.length;

        if (this.sprouted === true) {
            for (let i = 0; i < 4; i++) {
                if (this.subcells[i].points.length === 0) {
                    this.subcells[i] = new zero();
                    continue;
                }
                this.subcells[i].finalizecell();
            }
        }
        /*
        if (this.s === topcellsize) {
            c.strokeStyle = "rgb(0, 255, 0)";
        } else {
            c.strokeStyle = "rgba(100, 100, 255, 0.5)";
        }

        c.beginPath();
        c.strokeRect(this.x + camx + changex, this.y + camy + changey, this.s, this.s);
        */
    }

    calculateforce(pos) {
        if (this.avgx === pos.x && this.avgy === pos.y) return [0, 0]; // avoid divide by zero errors

        let dx = this.avgx - pos.x;
        let dy = this.avgy - pos.y;

        const pdist = dx * dx + dy * dy; // we can actually omit the square root
        if (pdist < 225) return [0, 0];
        
        if (this.sprouted && pdist < distsizes[this.s]) {
            let forcex = 0;
            let forcey = 0;

            for (let i = 0; i < 4; i++) {
                const f = this.subcells[i].calculateforce(pos);
                forcex += f[0];
                forcey += f[1];
            }

            return [ forcex, forcey ];
        }
        
        if (DEBUGTYPE === 2) {
            const d = (mousex - camx - changex - this.avgx) ** 2 + (mousey - camy - changey - this.avgy) ** 2;
            if (d < distsizes[this.s] || this.s === topcellsize) {
                c.strokeStyle = "rgb(255, 0, 0)";
                c.beginPath();
                c.strokeRect(this.x + camx + changex, this.y + camy + changey, this.s, this.s);
            }
        }

        const l = this.points.length;
        return [ dx / pdist * l, dy / pdist * l ]; // this is why we can omit square root
    }
}

function renderparticles(offsetx, offsety) {
    const pixels = c.createImageData(screensize.x, screensize.y);

    for (let i = 0; i < positions.length; i++) {
        const px = positions[i].x + offsetx;
        if (px < 0 || px > screensize.x) continue;

        const index = (Math.floor(px) + screensize.x * Math.floor(positions[i].y + offsety)) << 2;
        pixels.data[index] += 120;
        pixels.data[index + 1] += 60;
        pixels.data[index + 2] += 5;
        pixels.data[index + 3] = 255;
    }

    c.putImageData(pixels, 0, 0);
}

let lastdt = 0;
function showfps(dt) {
    c.textAlign = "center";
    c.fillStyle = "rgb(255, 255, 255)";
    c.font = "bold 15px monospace";
    c.fillText("FPS " + (1000 / (dt - lastdt)).toFixed(2), screensize.x / 2, screensize.y - 15);
    lastdt = dt;
}

function showposition() {
    c.textAlign = "center";
    c.fillStyle = "rgb(255, 255, 255)";
    c.font = "bold 15px monospace";
    c.fillText(-(camx + changex) + " " + -(camy + changey), screensize.x / 2, screensize.y - 30);
}

function buildquadtree() {
    grid = [];

    for (let i = 0; i < positions.length; i++) {
        const p = positions[i];
        const cellx = Math.floor(p.x / topcellsize) * topcellsize;
        const celly = Math.floor(p.y / topcellsize) * topcellsize;
        const gridindex = cellx + "," + celly;

        if (grid[gridindex] === undefined) grid[gridindex] = new quadtree(cellx, celly, topcellsize);
        grid[gridindex].addpoint(p);
    }

    for (let k in grid) {
        grid[k].finalizecell();
    }
}

function calculatevelocities() {
    for (let i = 0; i < velocities.length; i++) {
        const position = positions[i];
        const velocity = velocities[i];
        
        for (let k in grid) {
            const vectorforce = grid[k].calculateforce(position);
            velocity.x += vectorforce[0];
            velocity.y += vectorforce[1];
        }
    }
}

function applyvelocities() {
    for (let i = 0; i < positions.length; i++) {
        const p = positions[i];
        const v = velocities[i];
        p.x += v.x * timescale;
        p.y += v.y * timescale;
    }
}

function draw(dt) {
    c.strokeStyle = "rgb(0, 0, 255)";
    renderparticles(camx + changex, camy + changey);
    buildquadtree();
    calculatevelocities();
    applyvelocities();

    showfps(dt);
    if (mousedown) showposition();

    requestAnimationFrame(draw);
}
requestAnimationFrame(draw);