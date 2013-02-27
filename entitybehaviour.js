  // I'll come back to this
  checkAgainstLevel: function() {
    if(!this.scene.level) return
    var level = this.scene.level

    var res = level.checkQuadMovement(
      this.x, this.y, this.width, this.height, 
      this.velx * this.frameTime, this.vely * this.frameTime)

    if(res.horizontal && res.vertical) {
      this.x = res.x
      this.y = res.y
      this.velx = 0
      this.vely = 0
    }
    else if(res.horizontal) {
      this.vely = 0
      this.y = res.y
    } 
    else if(res.vertical) {
      this.velx = 0
      this.x = res.x
    }
    else if(res.collision) {
      this.x = res.x
      this.y = res.y
      this.velx = 0
      this.vely = 0
    }
  },
