/**
 * @fileoverview General-purpose key frame animation
 * @author Tony Parisi
 */

// goog.provide('glam.KeyFrameAnimator');
module.exports = KeyFrameAnimator;

var Component = require("../core/component");
var Interpolator = require("./interpolator");
var util = require("util");

util.inherits(KeyFrameAnimator, Component);

// KeyFrameAnimator class
// Construction/initialization
function KeyFrameAnimator(param)
{
  Component.call(this, param);

	param = param || {};

	this.interpdata = param.interps || [];
	this.animationData = param.animations;
	this.running = false;
	this.direction = KeyFrameAnimator.FORWARD_DIRECTION;
	this.duration = param.duration ? param.duration : KeyFrameAnimator.default_duration;
	this.loop = param.loop ? param.loop : false;
	this.easing = param.easing;
}


KeyFrameAnimator.prototype.realize = function()
{
	Component.prototype.realize.call(this);

	if (this.interpdata)
	{
		this.createInterpolators(this.interpdata);
	}

	if (this.animationData)
	{
		this.animations = [];
		var i, len = this.animationData.length;
		for (i = 0; i < len; i++)
		{
			var animdata = this.animationData[i];
			if (animdata instanceof THREE.glTFAnimation) {
				this.animations.push(animdata);
			}
			else {

				THREE.AnimationHandler.add(animdata);
				var animation = new THREE.KeyFrameAnimation(animdata.node, animdata.name);
//			animation.timeScale = .01; // why?
				this.animations.push(animation);
			}
		}
	}
}

KeyFrameAnimator.prototype.createInterpolators = function(interpdata)
{
	this.interps = [];

	var i, len = interpdata.length;
	for (i = 0; i < len; i++)
	{
		var data = interpdata[i];
		var interp = new Interpolator({ keys: data.keys, values: data.values, target: data.target });
		interp.realize();
		this.interps.push(interp);
	}
}

// Start/stop
KeyFrameAnimator.prototype.start = function()
{
	if (this.running)
		return;

	this.startTime = Date.now();
	this.lastTime = this.startTime;
	this.running = true;

	if (this.animations)
	{
		var i, len = this.animations.length;
		for (i = 0; i < len; i++)
		{
			this.animations[i].loop = this.loop;
			if (this.animations[i] instanceof THREE.glTFAnimation) {
				this.animations[i].direction =
					(this.direction == KeyFrameAnimator.FORWARD_DIRECTION) ?
						THREE.glTFAnimation.FORWARD_DIRECTION :
						THREE.glTFAnimation.REVERSE_DIRECTION;
			}
			this.animations[i].play(this.loop, 0);
			this.endTime = this.startTime + this.animations[i].endTime / this.animations[i].timeScale;
			if (isNaN(this.endTime))
				this.endTime = this.startTime + this.animations[i].duration * 1000;
		}
	}
}

KeyFrameAnimator.prototype.stop = function()
{
	this.running = false;
	this.dispatchEvent("complete");

	if (this.animations)
	{
		var i, len = this.animations.length;
		for (i = 0; i < len; i++)
		{
			this.animations[i].stop();
		}
	}

}

// Update - drive key frame evaluation
KeyFrameAnimator.prototype.update = function()
{
	if (!this.running)
		return;

	if (this.animations)
	{
		this.updateAnimations();
		return;
	}

	var now = Date.now();
	var deltat = (now - this.startTime) % this.duration;
	var nCycles = Math.floor((now - this.startTime) / this.duration);
	var fract = deltat / this.duration;
	if (this.easing)
		fract = this.easing(fract);

	if (nCycles >= 1 && !this.loop)
	{
		this.running = false;
		this.dispatchEvent("complete");
		var i, len = this.interps.length;
		for (i = 0; i < len; i++)
		{
			this.interps[i].interp(1);
		}
		return;
	}
	else
	{
		var i, len = this.interps.length;
		for (i = 0; i < len; i++)
		{
			this.interps[i].interp(fract);
		}
	}
}

KeyFrameAnimator.prototype.updateAnimations = function()
{
	var now = Date.now();
	var deltat = now - this.lastTime;
	var complete = false;

	var i, len = this.animations.length;
	for (i = 0; i < len; i++)
	{
		this.animations[i].update(deltat);
		if (!this.loop && (now >= this.endTime))
			complete = true;
	}
	this.lastTime = now;

	if (complete)
	{
		this.stop();
	}
}

// Statics
KeyFrameAnimator.default_duration = 1000;
KeyFrameAnimator.FORWARD_DIRECTION = 0;
KeyFrameAnimator.REVERSE_DIRECTION = 1;
