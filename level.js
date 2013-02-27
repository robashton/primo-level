var Eventable = require('primo-events')
  , _ = require('underscore')
  , SpriteMap = require('primo-spritemap')
  , Layer = require('./layer')
  , request = require('browser-request')

var Level = function(engine, path) {
  Eventable.call(this)
  this.path = path
  this.rawdata = null
  this.tilesets = {}
  this.spritemaps = {}
  this.entityTypes = {}
  this.pendingResults = 0
  this.finished = false
  this.engine = engine
  this.load()
}

Level.prototype = {
  loadInto: function(scene) {
    scene.reset()
    scene.on('pre-render', this.render, this)
    var i = 0
    for(i = 0; i < this.rawdata.entities.length; i++) {
      var config = this.rawdata.entities[i]
      var type = this.entityTypes[config.type]
      scene.spawnEntity(type, config.data)
    }
  },
  render: function(context) {
    for(var i = 0; i < this.layers.length; i++) 
      this.layers[i].render(context)
  },
  width: function() {
    return this.rawdata.width
  },
  height: function() {
    return this.rawdata.height
  },
  tilesize: function() {
    return this.rawdata.tilesize
  },
  layerdata: function(index) {
    return this.rawdata.layers[index]
  },
  tileset: function(name) {
    return this.tilesets[name]
  },
  spritemap: function(name) {
    return this.spritemaps[name]
  },
  load: function() {
    $.getJSON(this.path, _.bind(this.onLevelReceived, this))
  },
  worldToTile: function(world) {
    return Math.floor(world / this.rawdata.tilesize)
  },
  checkQuadMovement: function(x, y, width, height, velx, vely, res) {
    var steps = Math.ceil(Math.max(Math.abs(velx), Math.abs(vely)))
    var stepx = velx / steps
    var stepy = vely / steps
    res = res || {}

    var topleft = false, 
        topright = false, 
        bottomleft = false, 
        bottomright = false 

    for(var i = 0 ; i < steps ; i++) {
      var offsetx = stepx * i
      var offsety = stepy * i

      if(this.solidAt(x + offsetx, y + offsety))
        topleft = true

      if(this.solidAt(x + offsetx + width, y + offsety))
        topright = true

      if(this.solidAt(x + offsetx, y + offsety + height))
        bottomleft = true

      if(this.solidAt(x + offsetx + width, y + offsety + height))
        bottomright = true

      if(topleft || topright || bottomleft || bottomright) {
        res.x = x + offsetx - stepx
        res.y = y + offsety - stepy

        if(bottomleft && bottomright)
          res.horizontal = true
        if(topleft && topright)
          res.horizontal = true
        if(topright && bottomright)
          res.vertical = true
        if(topleft && bottomleft)
          res.vertical = true

        res.collision = true

        break
      }
    }
    return res
  },
  solidAt: function(worldx, worldy) {
    var x = parseInt(worldx, 10)
    var y = parseInt(worldy, 10)
    if(x < 0) return false
    if(y < 0) return false
    if(x >= this.width() * this.rawdata.tilesize) return false
    if(y >= this.height() * this.rawdata.tilesize) return false

    for(var i = 0 ; i < this.layers.length; i++) {
      var layer = this.layers[i]
      if(layer.iscollision() && layer.solidAt(x, y)) return true
    }
    return false
  },
  layerCount: function() {
    return this.data.layers.length
  },
  onLevelReceived: function(rawdata) {
    this.rawdata = rawdata
    this.tilesets = {}
    this.entityTypes = {}
    this.layers = []
    this.loadLayers()
    this.loadEntities()
    this.finished = true
    this.tryFinish()
  },
  loadLayers: function() {
    for(var i = 0 ; i < this.rawdata.layers.length; i++) 
      this.loadLayer(i)
  },
  addLayer: function(data) {
    var i = this.rawdata.layers.length
    this.rawdata.layers.push(data)
    this.layers.push(new Layer(this, i))
    this.loadLayer(i)
  },
  loadLayer: function(i) {
    var layer = this.rawdata.layers[i]
    var tilesets = this.tilesets
    var spritemaps = this.spritemaps
    var collisionmaps = this.collisionmaps
    var tilesize = this.tilesize()
    var engine = this.engine

    this.getJson(layer.tileset, function(tileset) {
      tilesets[layer.tileset] = tileset
      spritemaps[layer.tileset] = 
        engine.resources.spritemap(tileset.path, tileset.countwidth, tileset.countheight)
      spritemaps[layer.tileset].generateCollisionMaps(tileset.tilesize, tileset.tilesize)
    })
  },
  loadEntities: function() {
    for(var key in this.rawdata.entityTypes)  {
      this.loadEntity(key)
    }
  },
  loadEntity: function(key) {
    var path = this.rawdata.entityTypes[key]
    var entities = this.entityTypes
    entities[key] = require(path) // can probably get rid of this
  },

  getJson: function(dep, callback) {
    var self = this
    this.pendingResults++
    request(dep, function(err, response, body) {
      callback(JSON.parse(body))
      self.pendingResults--
      self.tryFinish()
    })
  },

  tryFinish: function() {
    if(this.pendingResults === 0 && this.finished) {
      this.createLayers()
      this.raise('loaded')
    }
  },
  createLayers: function() {
    for(var i = 0 ; i < this.rawdata.layers.length; i++) {
      this.layers[i] = new Layer(this, i)
    }
  },
  forEachLayer: function(cb) {
    for(var i = 0 ; i < this.layers.length; i++) {
      cb(this.layers[i])
    }
  },
  indexForWorldCoords: function(x, y) {
    var tilex = Math.floor(x / this.rawdata.tilesize)
    var tiley = Math.floor(y / this.rawdata.tilesize)
    var index = tilex + tiley * this.rawdata.width
    return index
  },
  setTileAt: function(layer, x, y, tile) {
    var index = this.indexForWorldCoords(x, y)
    this.rawdata.layers[layer].data[index] = tile
  },
  getTileAt: function(layer, x, y, tile) {
    var index = this.indexForWorldCoords(x, y)
    return this.rawdata.layers[layer].data[index] 
  }
}

_.extend(Level.prototype, Eventable.prototype)

module.exports = Level

