document.addEventListener("DOMContentLoaded", () => {
    new Compass("compass").draw()
})

class Compass {
    constructor(id) {

        const canvas = document.getElementById(id)
        this.ctx = canvas.getContext("2d")
        this.width = canvas.width
        this.height = canvas.height

        console.log(this.height)

        this.offset = 8
        this.draw = this.draw.bind(this)
        this.drawArm = this.drawArm.bind(this)
    }

    draw() {
        this.ctx.translate(this.width/2, this.height/2)
        for (let i = 0; i <= 4; i++) {
            this.drawArm()
            this.ctx.rotate((Math.PI / 180) * (i * 90))
        }
    }

    drawArm() {
        this.ctx.beginPath()
        this.ctx.moveTo(0, 0)
        this.ctx.lineTo(0 - this.offset, 0 -this.offset)
        this.ctx.lineTo(0,-this.height/2)
        this.ctx.lineTo(0,0)
        this.ctx.fill()

        this.ctx.beginPath()
        this.ctx.lineTo(0, -this.height/2)
        this.ctx.lineTo(this.offset, -this.offset)
        this.ctx.lineTo(0,0)
        this.ctx.stroke()
    }
}