/*
 * Copyright (C) 2013 salesforce.com, inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/*jslint sub: true */
/**
 * @class A value object wrapper for a primitive, such as a number, string, boolean, or date.
 * A value object is a thin wrapper around the actual data. The wrapper layer around the literal JavaScript objects enables you
 * to modify data in a transactional manner. The framework selectively rerenders and updates the UI in response to data changes.
 *
 * @constructor
 * @protected
 */
function SimpleValue(config, def, component) {
    $A.ns.AttributeValue.call(this);
    $A.assert(!config || config.auraType !== this.auraType);

    /** Initial value of the simple value.  Please be a simple type! */
    this.value = config;

    /** Optional component "owning" this value. */
    this.owner = component;

    /** DefDescriptor name for the value. */
    this.name = undefined;
//#if {"modes" : ["DEVELOPMENT", "STATS"]}
    if (def) {
        /** Name of this object */
        this.name = def.getDescriptor().getQualifiedName();
    }

//#end

    /** Set "true" during a change. */
    this.dirty = false;

    /** During a change, holds the old value in case of rollback. */
    this.oldValue = undefined;

    /** Validity of value */
    this.invalid = false;

    /** Errors. */
    this.errors = undefined;

//#if {"modes" : ["STATS"]}
    valueFactory.index(this);
//#end
}

// Copy the AttributeValue.prototype, so its methods are available:
$A.ns.Util.derivePrototype(SimpleValue, $A.ns.AttributeValue);

SimpleValue.prototype.auraType  = "Value";
SimpleValue.prototype._getValueType = function () {
    return "SimpleValue";
};
SimpleValue.prototype._hasChanged = function (rawMapValue) {
    return this.unwrap() !== rawMapValue;
};

/**
 * DO NOT USE THIS METHOD.
 *
 * @public
 *
 * @deprecated use Component.get(key) instead
 */
SimpleValue.prototype.getValue = function () {
    //$A.warning("DEPRECATED USE OF simpleValue.getValue(). USE component.get(key) INSTEAD.", {key: this.name, value: this.value});
    return this._getValue();
};

/**
 * Returns the unwrapped value. This is the underlying value that is wrapped in the value object. The last value set will always be returned,
 * committed or not.
 *
 * TEMPORARILY INTERNALIZED TO GATE ACCESS
 *
 * @private
 */
SimpleValue.prototype._getValue = function() {
    return this.value;
};

/**
 * Returns the unwrapped value.
 */
SimpleValue.prototype.unwrap = function() {
    return this._getValue();
};

/**
 * Merges the passed in value, replacing its value with the given input or doing nothing
 * depending on the overwrite parameter.  This is the leaf of a recursive support of merge
 * for ArrayValue and MapValue collections.
 *
 * @param {Object} sv - The value to overwrite.
 * @param {Boolean} overwrite - If overwrite is false, this method only does a type check for the sv argument
 *  and throws an error if it's not a SimpleValue.
 */
SimpleValue.prototype.merge = function(sv, overwrite) {
    if (!$A.util.instanceOf(sv, SimpleValue)) {
        throw new Error("Cannot merge a " + (typeof sv) + " into a SimpleValue");
    }

    if (overwrite) {
        this._setValue(sv._getValue());
        this.commit();
    }
};

/**
 * DO NOT USE THIS METHOD.
 *
 * @public
 *
 * @deprecated use $A.util.getBooleanValue(Component.get(key)) instead
 */
SimpleValue.prototype.getBooleanValue = function () {
    //$A.warning("DEPRECATED USE OF simpleValue.getBooleanValue(). USE $A.util.getBooleanValue(component.get(key)) INSTEAD.", {key: this.name, value:this.value});
    return this._getBooleanValue();
};

/**
 * Coerces the wrapped value into a boolean value.
 *
 * TEMPORARILY INTERNALIZED TO GATE ACCESS
 *
 * @private
 */
SimpleValue.prototype._getBooleanValue = function() {
    var val = this._getValue();
    return val !== undefined && val !== null && val !== false && val !== 0 && val !== "false" && val !== "" && val !== "f";
};

/**
 * Returns true if the value is not undefined. An undefined value object has not been assigned a value.
 */
SimpleValue.prototype.isDefined = function() {
    var val = this._getValue();
    return val !== undefined;
};

/**
 * Always returns the last wrapped value that was committed.  So, at rest,
 * this returns this.value, but if there is an uncommitted value (indicated
 * by the presence of this.oldValue), it instead returns this.oldValue.
 */
SimpleValue.prototype.getPreviousValue = function() {
    return this.isDirty() ? this.oldValue : this.value;
};

/**
 * DO NOT USE THIS METHOD.
 *
 * @public
 *
 * @deprecated use Component.set(name,value) instead
 */
SimpleValue.prototype.setValue = function (v, skipChange) {
    //$A.warning("DEPRECATED USE OF simpleValue.setValue(name,value). USE component.set(name,value) INSTEAD.");
    this._setValue(v, skipChange);
};

/**
 * Sets the wrapped value. This causes isDirty to return true until commit() is
 * called.
 *
 * @param {Object} v The value to be set.
 * @param {Boolean} skipChange Set to true if you want to skip firing of the change event, which indicates that the content or state has changed. Or set to false if you want to fire the change event.
 *
 * TEMPORARILY INTERNALIZED TO GATE ACCESS
 *
 * @private
 */
SimpleValue.prototype._setValue = function(v, skipChange) {
    if (this.observing) {
        if (this.observing === v) {
            if (this.value !== v.value) {
                this._setValue(v.value);
            }
            return;  // Already done; nothing to do here
        }
        if (this.observing.value != v) {
            this.unobserve(this.observing);  // Implicitly unlink by explicit assignment
        }
    }

    if (v instanceof SimpleValue) {
        // The idiom foo.setValue(sv) used to be used to create a "tracking"
        // assignment, albeit buggily, so that semantic is preserved here.
        $A.warning("Prefer SimpleValue.observe(wrappedvalue) for tracking assignments, not SV.setValue(wrappedvalue)");
        this.observe(v);
        return;  // The observe also does an initial setvalue.
    }

    // JBUCH TODO: VERIFY WE DON'T FIRE CHANGE EVENTS IF VALUE IS UNCHANGED
    // DON'T CHANGE ME BRO! *CHAAAAAAAANNNNNNNNGEEEEEEEE*
    if(this.value===v){
        return;
    }

    this.makeDirty();
    var list = null;
    if (!skipChange) {
        list = this.prepare("change");
    }

    this.oldValue = this.value;
    this.value = v;

    if (!skipChange) {
        this.updatePendingValue("change", this);
        this.firePending("change", list);
    }

    this.informObservers(this.value);
};

/**
 * @private
 */
SimpleValue.prototype.makeDirty = function() {
    if (!this.dirty) {
        this.dirty = true;
        if (this.owner) {
            $A.renderingService.addDirtyValue(this);
        }
    }
};

/**
 * Returns true if a value has been set, but not yet committed or rolled back.
 */
SimpleValue.prototype.isDirty = function() {
    return this.dirty === true;
};

/**
 * Returns true as this is not an expression.
 */
SimpleValue.prototype.isLiteral = function() {
    return true;
};

/**
 * Returns false as this is not an expression.
 */
SimpleValue.prototype.isExpression = function() {
    return false;
};

/**
 * Removes the previous value, and replaces it with the current uncommitted
 * value. If there is no uncommitted value, nothing will happen. isDirty() will
 * return false after this is called.
 * Aura automatically calls commit() after rerendering a component.
 * You can call commit() yourself if you want to avoid triggering the rerendering phase.
 * You should only do this for data that changes but is not rendered or passed into
 * another component that could render it.
 *
 * @param {Object} clean Do not use this internal-only parameter.
 */
SimpleValue.prototype.commit = function(clean) {
    if (this.isDirty()) {
        this.oldValue = undefined;
        this.dirty = false;
        if (!clean && this.owner) {
            // was called by user directly
            $A.renderingService.removeDirtyValue(this);
        }
    }
};

/**
 * Removes the current uncommitted value, if there is one. isDirty() will return
 * false after this is called.
 *
 * @param {Object} clean - Do not use this internal-only parameter
 */
SimpleValue.prototype.rollback = function(clean) {
    if (this.isDirty()) {
        this.value = this.oldValue;
        this.commit(clean);
    }
};

/**
 * Sets the value as valid or not. Clears errors if set to valid.
 *
 * @param {Boolean} status Make the value valid (true) or not (anything else).
 */
SimpleValue.prototype.setValid = function(status) {
    if (status != this.isValid()) {
        this.makeDirty();  // if we're changing valid state, we're dirty
    }
    if (status === true) {
        this.invalid = false;
        this.errors = undefined;   // clean out errors
    } else {
        this.invalid = true;
    }
};

/**
 * Returns whether this value is valid.
 */
SimpleValue.prototype.isValid = function() {
    return !this.invalid;
};

/**
 * Adds the error message(s).
 * @param {Array|Object} messages The messages to be added.
 */
SimpleValue.prototype.addErrors = function(messages) {
    if (messages) {
        if ($A.util.isUndefined(this.errors)) {
            this.errors = [];
        }

        if ($A.util.isArray(messages)) {
        	for(var i=0; i< messages.length; i++){
        		this.errors.push(messages[i]);
        	}
        } else {
            this.errors.push(messages);
        }
    }
};

/**
 * Clears the error messages.
 */
SimpleValue.prototype.clearErrors = function() {
    this.errors = undefined;
};

/**
 * Gets the error message(s).
 */
SimpleValue.prototype.getErrors = function() {
    if (!this.errors) {
        this.errors = [];
    }

    return this.errors;
};

/**
 * Destroys the value wrapper.
 */
SimpleValue.prototype.destroy = function(async) {

//#if {"modes" : ["STATS"]}
    valueFactory.deIndex(this);
//#end

    this.rollback();
    var val = this.getValue();
    if (val && val.destroy) {
        val.destroy(async);
    }

    this.handlers = undefined;
    this.value = undefined;
    this.newValue = undefined;
    this.invalid = undefined;
    this.errors = undefined;
};

/**
 * @private
 */
SimpleValue.prototype.fire = function(name) {
    BaseValue.fire(name, this.unwrap(), this.getEventDispatcher());
};

/**
 * Adds a handler to BaseValue based on the given config.
 * @param {Object} config
 */
SimpleValue.prototype.addHandler = function(config) {
    BaseValue.addHandler(config, this.getEventDispatcher());
};

/**
 * Destroys the handlers.
 * @private
 */
SimpleValue.prototype.destroyHandlers = function(globalId) {
    BaseValue.destroyHandlers(globalId, this.getEventDispatcher());
};

SimpleValue.prototype.toString = function() {
    return "SimpleValue";
};

//#include aura.value.SimpleValue_export
