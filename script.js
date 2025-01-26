/*
  ptcl - particle
  pxl - pixel
*/
class PerfMonitor {
    constructor(interval) {
        this.frameTimes = []
        this.frameCount = 0
        this.interval = interval
        this.startTime = 0
    }
    start() {
        this.startTime = performance.now()
    }
    end() {
        const endTime = performance.now()
        const frameTime = endTime - this.startTime
        this.frameTimes.push(frameTime)
        this.frameCount++
        if (this.frameCount >= this.interval) {
            const averageFrameTime =
                this.frameTimes.reduce((sum, time) => sum + time, 0) /
                this.frameTimes.length
            console.log(`Average frame time: ${averageFrameTime.toFixed(2)}ms`)
            this.frameTimes = []
            this.frameCount = 0
        }
    }
}
class Particle {
    constructor(effect, x, y, colors, i) {
        this.effect = effect
        this.fromNext = false
        this.originX = Math.floor(x)
        this.originY = Math.floor(y)
        this.x = this.originX
        this.y = this.originY
        this.colors = colors
        this.i = i
        this.size = this.effect.ptclSize
        this.vx = 0
        this.vy = 0
        this.ease = 0.05
        this.friction = 0.8
        this.dx = 0
        this.dy = 0
        this.distance = 0
        this.force = 0
        this.angle = 0
    }
    update() {
        this.dx = this.effect.mouse.x - this.x
        this.dy = this.effect.mouse.y - this.y
        this.distance = this.dx ** 2 + this.dy ** 2
        this.distance = Math.max(this.distance, 0.1)
        if (this.distance < this.effect.mouse.radius) {
            if (this.effect.transitionTimestamp + 1500 < performance.now()) {
                this.updateColor()
                this.fromNext = true
            }
            this.force = -this.effect.mouse.radius / this.distance
            this.angle = Math.atan2(this.dy, this.dx)
            this.vx += this.force * Math.cos(this.angle)
            this.vy += this.force * Math.sin(this.angle)
        }
        this.vx *= this.friction
        this.vy *= this.friction
        this.x += this.vx + (this.originX - this.x) * this.ease
        this.y += this.vy + (this.originY - this.y) * this.ease
    }
    updateColor() {
        this.colors =
            this.effect.ptclsStorage[this.effect.nextImg][this.i].colors
    }
}
class Effect {
    constructor(canvas, outerSpace, imgs, hint) {
        this.canvas = canvas
        this.outerSpace = outerSpace
        this.width = canvas.width
        this.height = canvas.height
        this.ptclsStorage = []
        this.ptclsArray = []
        this.imgs = imgs
        this.imgsLength = imgs.length
        this.nextImg = 1
        this.transitionTimestamp = 0
        this.hint = hint
        this.ptclSize = 20
        this.mouse = {
            fullRadius: 50 ** 2,
            radius: 1,
            x: undefined,
            y: undefined,
        }
        window.addEventListener("mousemove", (event) => {
            this.mouse.x = event.clientX
            this.mouse.y = event.clientY
            this.handleMove()
        })
        window.addEventListener("touchmove", (event) => {
            this.mouse.x = event.touches[0].clientX
            this.mouse.y = event.touches[0].clientY
            this.handleMove()
        })
    }
    handleMove() {
        const rect = this.canvas.getBoundingClientRect()
        const adjust = this.canvas.width / rect.width
        this.mouse.x = (this.mouse.x - rect.left) * adjust
        this.mouse.y = (this.mouse.y - rect.top) * adjust
        if (this.mouse.radius < this.mouse.fullRadius) {
            this.mouse.radius += this.mouse.radius ** 0.5 * 5
        }
        if (this.hint) this.hint.remove()
    }
    init(ctx) {
        for (let i = 0; i < this.imgsLength; i++) {
            this.ptclsStorage[i] = []
            ctx.drawImage(this.imgs[0], this.outerSpace, this.outerSpace)
            const pxls = ctx.getImageData(0, 0, this.width, this.height).data
            for (let ptclY = 0; ptclY < this.height; ptclY += this.ptclSize) {
                for (
                    let ptclX = 0;
                    ptclX < this.width;
                    ptclX += this.ptclSize
                ) {
                    const ptclDataI = (ptclY * this.width + ptclX) * 4
                    const colors = []
                    let allAlphaTransparent = true
                    for (let pxlY = 0; pxlY < this.ptclSize; pxlY++) {
                        for (let pxlX = 0; pxlX < this.ptclSize; pxlX++) {
                            const pxlI =
                                ptclDataI + (pxlY * this.width + pxlX) * 4
                            if (pxls[pxlI + 3] === 0) continue
                            allAlphaTransparent = false
                            colors.push(pxls[pxlI])
                            colors.push(pxls[pxlI + 1])
                            colors.push(pxls[pxlI + 2])
                            colors.push(pxls[pxlI + 3])
                        }
                    }
                    if (allAlphaTransparent) continue
                    this.ptclsStorage[i].push(
                        new Particle(
                            this,
                            ptclX,
                            ptclY,
                            colors,
                            this.ptclsStorage[i].length
                        )
                    )
                }
            }
            this.imgs[0].remove()
        }
        this.ptclsArray = this.ptclsStorage[0].map((ptcl) =>
            Object.assign(Object.create(Object.getPrototypeOf(ptcl)), ptcl, {
                colors: [...ptcl.colors],
            })
        )
        this.canvas.style.display = "block"
    }
    draw(ctx) {
        const imgData = ctx.createImageData(this.width, this.height)
        this.ptclsArray.forEach((ptcl) => {
            const ptclX = Math.round(ptcl.x)
            const ptclY = Math.round(ptcl.y)
            for (let pxlY = 0; pxlY < this.ptclSize; pxlY++) {
                for (let pxlX = 0; pxlX < this.ptclSize; pxlX++) {
                    if (
                        ptclX + pxlX < 0 ||
                        ptclX + pxlX >= this.width ||
                        ptclY + pxlY < 0 ||
                        ptclY + pxlY >= this.height
                    ) {
                        continue
                    }
                    const pxlI =
                        ((ptclY + pxlY) * this.width + (ptclX + pxlX)) * 4
                    let colorI = (pxlY * this.ptclSize + pxlX) * 4
                    imgData.data[pxlI] = ptcl.colors[colorI]
                    imgData.data[pxlI + 1] = ptcl.colors[colorI + 1]
                    imgData.data[pxlI + 2] = ptcl.colors[colorI + 2]
                    imgData.data[pxlI + 3] = ptcl.colors[colorI + 3]
                }
            }
        })
        ctx.putImageData(imgData, 0, 0)
    }
    update() {
        this.mouse.radius -= this.mouse.radius ** 0.5 * 2
        if (this.mouse.radius < 1) this.mouse.radius = 1
        let fromNextCounter = 0
        this.ptclsArray.forEach((ptcl) => {
            ptcl.update()
            if (ptcl.fromNext) fromNextCounter++
        })
        if (fromNextCounter / this.ptclsArray.length > 0.85) {
            this.transitionTimestamp = performance.now()
            this.ptclsArray.forEach((ptcl) => {
                ptcl.fromNext = false
                ptcl.updateColor()
            })
            this.nextImg = (this.nextImg + 1) % this.imgsLength
        }
    }
}
window.addEventListener("load", function () {
    const canvas = document.getElementsByTagName("canvas")[0]
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    const outerSpace = 60
    canvas.width = 420 + outerSpace * 2
    canvas.height = 660 + outerSpace * 2
    const imgs = document.getElementsByTagName("img")
    const hint = document.getElementById("touchHint")
    const effect = new Effect(canvas, outerSpace, imgs, hint)
    effect.init(ctx)
    // const perfMonitor = new PerfMonitor(60);
    function animate() {
        // perfMonitor.start();
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        effect.draw(ctx)
        effect.update()
        // perfMonitor.end();
        requestAnimationFrame(animate)
    }
    animate()
})
