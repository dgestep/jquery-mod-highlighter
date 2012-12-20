/*!
 * jQuery Modification Highlighter
 * Author: Doug Estep.
 * Version 1.0.0
 * 
 * API Documentation: 
 *   http://dougestep.com/dme/jquery-mod-highlighter-widget 
 * 
 * Depends:
 *   jquery 1.7.1 +
 *   jquery-ui 1.8.20+ using the following plugins.
 *     jQuery UI widget factory bump
 */
(function($, undefined) {
	var classModHighlighterContainer = "hasModificationHighlighter";
	var panelsIgnoreModified = "panels-ignore-modified";
	var panelsEvaluateModified = "panels-evaluate-modified";
	var classTrackerInputModifiable = "tracker-input-modifiable";
	var dataTrackerOriginalValue = "data-tracker-original-value";
	
	$.widget("dtg.modificationHighlighter", {
		options: {
			// comma-separated list of additional input types to be added to the list 
			// used in a jQuery selector to select all inputable columns. Example: 'select, input:text'.
			addlSelectableInputTypes : '',
			inputNotModifiedIfHasClass: 'error',
			// this class will be set on any modified column
			modifiedColumnClass: "ui-state-highlight",
			// this class will be set the label associated with any modified column
			modifiedLabelClass: "ui-state-highlight"
		},
		
		_create : function() {
			if (this.element.hasClass(classModHighlighterContainer)) {
				// element already has this plugin associated with
				return;
			}
			
			this.storeOriginalValues(this.element.id);
			
			// mark container as being associated with this plugin
			if (!this.element.hasClass(classModHighlighterContainer)) {
				this.element.addClass(classModHighlighterContainer);
			}
		},
		
		_setOption: function( key, value ) {	
			this.options[ key ] = value;
		},
		
		/**
		 * Returns an array of column objects. Each entry in the array represents a column within the 
		 * supplied container where the current value is different than the original value 
		 * stored upon initial load.
		 * @param containerId the ID value for the internal container which contains the input-type objects to evaluate. Supplying
		 * null, undefined, or not suppling a value will result in the entire container being evaluated.
		 */
		getModifiedColumns : function(containerId) {
			var columns = [];
			var withClasses = [];
			withClasses.push(this.options.modifiedColumnClass);
			withClasses.push(this.options.inputNotModifiedIfHasClass);
			var selector = this._createSelectorForInputTypes(containerId, withClasses);
			
			var plugin = this;
			$(selector).each(function(event) {
				var inp = $(this);
				if (plugin._isRadioButton(inp)) {
					if (!inp.is(':checked')) {
						return true;
					}
				}
				
				var originalValue = inp.data(dataTrackerOriginalValue);
				var currentValue = plugin._getValueOfInput(inp);
				var id = plugin._getKeyForInputValueStorage(inp);
				var labelText = plugin._getLabelTextForInputId(id);
				var column = plugin._createColumnStructure(id, currentValue, originalValue, labelText);
				columns.push(column);
			});
			return columns;
		},
		
		/**
		 * Returns an array of column objects where the column has the supplied CSS class associated with it within the supplied container. 
		 * @param containerId the ID value for the internal container which contains the input-type objects to evaluate. Supplying
		 * null, undefined, or not suppling a value will result in the entire DOM being evaluated.
		 * @param className the class name to search for.
		 */
		getAllColumnsWithSuppliedClass : function(containerId, className) {
			var columns = [];
			if (this._isNullOrUndefined(className)) { return columns; }
			
			var withClasses = [];
			withClasses.push(className);
			var selector = this._createSelectorForInputTypes(containerId, withClasses);
			
			var plugin = this;
			$(selector).each(function(event) {
				var inp = $(this);
				var originalValue = inp.data(dataTrackerOriginalValue);
				var currentValue = plugin._getValueOfInput(inp);
				var id = plugin._getKeyForInputValueStorage(inp);
				var labelText = plugin._getLabelTextForInputId(id);
				var column = plugin._createColumnStructure(id, currentValue, originalValue, labelText);
				columns.push(column);
			});
			return columns;
		},
		
		/**
		 * Returns the column object stored upon load that is associated to the supplied 
		 * search column ID in the supplied container.
		 * @param containerId the ID value for the internal container which contains the input-type objects to evaluate. Supplying
		 * null, undefined, or not suppling a value will result in the entire container being evaluated.
		 * @param searchColumnId the column ID to search for.
		 * @return the found column or null if not found.
		 */
		getStoredInputValue : function(containerId, searchColumnId) {
			var columns = this.getStoredInputColumns(containerId);
			var foundColumn = null;
			for (var i = 0; i < columns.length; i++) {
				var column = columns[i];
				if (column.id == searchColumnId) {
					foundColumn = column;
					break;
				}
			}
			return foundColumn;
		},
		
		/**
		 * Returns an array of column objects stored upon load for the supplied container.  
		 * @param containerId the ID value for the internal container which contains the input-type objects to evaluate. Supplying
		 * null, undefined, or not suppling a value will result in the entire container being evaluated.
		 */
		getStoredInputColumns : function(containerId) {
			var columns = [];
			var withClasses = [];
			withClasses.push(classTrackerInputModifiable);
			var selector = this._createSelectorForInputTypes(containerId, withClasses);
			
			var plugin = this;
			$(selector).each(function() {
				var inp = $(this);
				var val = inp.data(dataTrackerOriginalValue);
				if (val != null) {
					var column = plugin._createAndPopulateColumnStructure(inp);
					columns.push(column);
				}
			});
			return columns;
		},
		
		_createAndPopulateColumnStructure : function(inp) {
			var originalValue = inp.data(dataTrackerOriginalValue);
			var currentValue = this._getValueOfInput(inp);
			
			var id = this._getKeyForInputValueStorage(inp);
			var labelText = this._getLabelTextForInputId(id);
			return this._createColumnStructure(id, currentValue, originalValue, labelText);
		},
		
		_createColumnStructure : function(id, currentValue, originalValue, labelText) {
			var s = {
				'id' : id,
				'value' : currentValue,
				'originalValue' : originalValue,
				'label': labelText 
			};
			return s;			
		},
		
		/**
		 * Resets all columns that have been modified within the supplied container to their original value as determined 
		 * when the container was originally loaded.
		 * @param containerId the ID value for the internal container which contains the input-type objects to evaluate. Supplying
		 * null, undefined, or not suppling a value will result in the entire container being evaluated.
		 */
		reset : function(containerId) {
			// fire user passed event
			var brmc = $.Event("beforeResetModifiedColumns");
			this._trigger("beforeResetModifiedColumns", brmc, {
				'element' : this.element,
				'containerId': containerId
			});
			if (brmc.isDefaultPrevented()) { return; }		
			
			var columns = this.getModifiedColumns(containerId);
			for (var i = 0; i < columns.length; i++) {
				var column = columns[i];
				var inp = this._findInputObjectByColumn(containerId, column.id);
				
				var rmci = $.Event("resetModifiedColumnsIteration");
				this._trigger("resetModifiedColumnsIteration", rmci, {
					'element' : this.element,
					'column' : column, 
					'input' : inp,
					'index' : i
				});
				if (rmci.isDefaultPrevented()) { 
					continue; 
				}
				
				// reset checkbox
				if (this._isCheckBox(inp)) {
					if (column.originalValue == "true") {
						inp.attr("checked", "checked");
					} else {
						inp.removeAttr("checked");
					}
					inp.trigger("change");
					continue;
				}
				// reset radio button
				if (this._isRadioButton(inp)) {
					var name = column.id;
					var radioColumn = this.getStoredInputValue(containerId, name);
					if (radioColumn != null) {
						var originalValue = radioColumn.originalValue;
						this._resetRadio(inp, originalValue);
						inp.trigger("change");
					}
					continue;
				}
				
				// reset input 
				inp.val(column.originalValue);
				inp.removeClass(this.options.inputNotModifiedIfHasClass);
				
				inp.trigger("change");
			}
			
			// fire user passed event
			var armc = $.Event("afterResetModifiedColumns");
			this._trigger("afterResetModifiedColumns", armc, {
				'element' : this.element,
				'containerId': containerId
			});
		},
		
		_findInputObjectByColumn : function(containerId, id) {
			var inp = null;
			if (this._isNullOrUndefined(containerId)) {
				inp = $(this._prepId(id));
			} else {
				inp = $(this._prepId(containerId) + " " + this._prepId(id));
			}
			if (inp.length == 0) {
				var name = this._escapeValue(id);
				if (this._isNullOrUndefined(containerId)) {
					inp = $("[name=" + name + "]");
				} else {
					inp = $(this._prepId(containerId) + " [name=" + name + "]");
				}
			}
			return inp;
		},
		
		/**
		 * Stores internally the value of all input-type objects identified by the supplied container. 
		 * @param containerId the ID value for the internal container which contains the input-type objects to evaluate. Supplying
		 * null, undefined, or not suppling a value will result in the entire container being evaluated.
		 */
		storeOriginalValues : function(containerId) {
			// define change event
			this._defineChangeEvent(containerId);
			
			var selector = this._createSelectorForInputTypes(containerId, null);
			
			var plugin = this;
			$(selector).each(function() {
				var inp = $(this);
				var ignoreModified = plugin._isExceptionToRule(inp, panelsIgnoreModified, panelsEvaluateModified);
				if (ignoreModified) { return true; }
				
				if (plugin._isRadioButton(inp)) {
					if (!inp.is(':checked')) {
						return true;
					}
				}
				
				if (plugin._isWorthyOfStorage(inp)) {
					var val = plugin._getValueOfInput(inp);
					inp.data(dataTrackerOriginalValue, val);
					inp.addClass(classTrackerInputModifiable);
					
					inp.trigger("change");
				}
			});
		},
		
		_defineChangeEvent : function(containerId) {
			// defines a listener which listens for a change event for a column 
			// and highlights the column.  Removes the highlight if no longer modified.
			var selector = this._createSelectorForInputTypes(containerId, null);
			var plugin = this;
			$(selector).on("change", function(event) {
				var inp = $(this);
				if (plugin._isIgnoreChange(inp)) { return true; }
				
				var id = plugin._getKeyForInputValueStorage(inp);
				if (plugin._isModified(inp)) {
					plugin._setInputAsModified(inp, id);
				} else {
					plugin._setInputAsNotModified(inp, id);
				}
				
				// fire user event
				var ac = $.Event("afterChange");
				plugin._trigger("afterChange", ac, {
					'element' : this.element,
					'input' : inp
				});
			});			
		},
		
		_createSelectorForInputTypes : function(containerId, withClasses) {
			var selector = this._formatSelectorForContainerId(containerId);
			if (this._isNullOrUndefined(withClasses)) {
				withClasses = [];
				withClasses.push("");
			}
			var addlSelectableInputTypes = $.trim(this.options.addlSelectableInputTypes);
			var inputTypes = "";
			for (var i = 0; i < withClasses.length; i++) {
				var withClass = withClasses[i];
				if (withClass != "") {
					withClass = "." + withClass;
				}
				if (i > 0) {
					inputTypes += ", ";
				}
				
				inputTypes += this._getSelectableInputTypes(selector, addlSelectableInputTypes, withClass);
			}
			
			return inputTypes;
		},
		
		_formatSelectorForContainerId : function(containerId) {
			var panelId = this.element.attr("id");
			if (panelId == containerId) {
				containerId = null;
			}
			var selector = '#' + containerId + ' ';
			if (this._isNullOrUndefined(containerId)) {
				selector = '';
			}
			if (selector == '') {
				selector = '#' + panelId;
			} else {
				selector = '#' + panelId + ' ' + selector;
			}
			return selector + ' ';
		},
		
		_getSelectableInputTypes : function(selector, addlSelectableInputTypes, withClass) {
			var inputs = null;
			var defaultTypes = 'input:text,input:checkbox,input:radio,input[type=email],select,textarea'.split(",");
			var addl = null;
			if (addlSelectableInputTypes.length > 0) {
				addl = addlSelectableInputTypes.split(",");
				inputs = defaultTypes.concat(addl);
			} else {
				inputs = defaultTypes;
			}
			
			var types = [];
			for (var i = 0; i < inputs.length; i++) {
				var input = $.trim(inputs[i]);
				var s = selector + input + withClass + ", ";
				types.push(s);
			}
			
			var all = types.join('');
			var idx = all.lastIndexOf(", ");
			return all.substring(0, idx);
		},
		
		_isIgnoreChange : function(inp) {
			var errorClass = this.options.inputNotModifiedIfHasClass;
			if (errorClass != '' && inp.hasClass(errorClass)) {
				// if input has inputNotModifiedIfHasClass CSS class, then ignore the input
				return true;
			}
			if (this._isExceptionToRule(inp, panelsIgnoreModified, panelsEvaluateModified)) {
				// if the input doesn't have the inputNotModifiedIfHasClass CSS class but is an exception, then ignore the input
				return true;
			}
			// do not ignore the input
			return false;
		},
		
		_isExceptionToRule : function(inp, exceptionToRuleClass, evaluateAnywayClass) {
			var exceptionToRule = inp.hasClass(exceptionToRuleClass);
			if (exceptionToRule) {
				// input has the exceptionToRule CSS class
				return true;
			}
			
			var evaluateAnyway = this._isNotNullAndNotUndefined(evaluateAnywayClass) && inp.hasClass(evaluateAnywayClass);
			if (!evaluateAnyway) {
				// look up the DOM for a parent that has the exceptionToRule CSS class
				var p = inp.parents("." + exceptionToRuleClass);
				if (p.length > 0) {
					// found one.
					return true;
				}
			}
			// not an exception to the rule
			return false;
		},
		
		_getKeyForInputValueStorage : function (inp) {
			var name = inp.attr("id");
			if (this._isNullOrUndefined(name) || this._isRadioButton(inp)) {
				name = inp.attr("name");
			}
			return name;
		},
		
		_setInputAsModified : function(inp, inputId) {
			inp.addClass(this.options.modifiedColumnClass);
			if (this._isRadioButton(inp)) {
				this._highlightRadioLabel(inp, true);
			} else {
				var label = this._getLabelForInput(inp);
				if (label != null && label.length > 0) {
					label.addClass(this.options.modifiedLabelClass);
				}
			}
			
			// fire user event
			var miam = $.Event("markInputAsModified");
			this._trigger("markInputAsModified", miam, {
				'element' : this.element,
				'input' : inp,
				'inputId' : inputId
			});
		},
		
		_highlightRadioLabel : function(inp, highlight) {
			if (!this._isRadioButton(inp)) { return; }
			
			var plugin = this;
			var name = this._getKeyForInputValueStorage(inp);
			var panelId = "#" + this.element.attr("id") + " input[name=" + this._escapeValue(name) + "]";
			$(panelId).each(function(index) {
				var radioInp = $(this);
				var id = radioInp.attr("id");
				if (plugin._isNotNullAndNotUndefined(id)) {
					var label = plugin._getLabelById(id);
					if (label != null && label.length > 0) {
						if (highlight) {
							label.addClass(plugin.options.modifiedLabelClass);
						} else {
							label.removeClass(plugin.options.modifiedLabelClass);
						}
					}
				}
			});
		},
		
		_setInputAsNotModified : function(inp, inputId) {
			inp.removeClass(this.options.modifiedLabelClass);
			if (this._isRadioButton(inp)) {
				this._highlightRadioLabel(inp, false);
			} else {
				var label = this._getLabelForInput(inp);
				if (label != null && label.length > 0) {
					label.removeClass(this.options.modifiedLabelClass);
				}
			}
			
			// fire user event
			var mianm = $.Event("markInputAsNotModified");
			this._trigger("markInputAsNotModified", mianm, {
				'element' : this.element,
				'input' : inp,
				'inputId' : inputId
			});
		},
		
		_getLabelForInput : function(inp) {
			var id = this._getKeyForInputValueStorage(inp);
			var label = this._getLabelById(id);
			if (label.length == 0) {
				id = inp.attr("id");
				if (this._isNotNullAndNotUndefined(id)) {
					label = this._getLabelById(id);
				}
			}
			return label;
		},
		
		_getLabelById : function(id) {
			if (this._isNullOrUndefined(id)) { return null; }
			
			var panelId = this.element.attr("id");
			var escapedId = this._escapeValue(id);
			var label = $("#" + panelId + " label[for=" + escapedId + "]");
			return label;
		},
		
		_getLabelTextForInputId : function(id) {
			var labelText = "";
			var label = this._getLabelById(id);
			if (label != null && label.length > 0) {
				labelText = label.text();
			}
			return labelText;
		},
		
		_isModified : function(inp) {
			var modified = false;
			var originalValue = inp.data(dataTrackerOriginalValue);
			var currentValue = this._getValueOfInput(inp);
			
			var radio = this._isRadioButtonAndChecked(inp);
			if (radio && originalValue == null && currentValue != null) { 
				modified = true;
			} else {
				var notEq = this._isNotNullAndNotUndefined(originalValue) && originalValue.toString() != currentValue.toString();			
				if (radio && notEq) {
					modified = true;
				} else {
					modified = this._isNotNullAndNotUndefined(originalValue) && notEq;
				}
			}
			
			// fire user event 
			var im = $.Event("isInputModified");
			var data = {
				'element' : this.element,
				'input' : inp,
				'modified' : modified
			};
			this._trigger("isInputModified", im, data);
			modified = data.modified;
			return modified;
		},
		
		_isRadioButtonAndChecked : function(inp) {
			var found = false;
			if (this._isRadioButton(inp)) {
				var chk = inp.attr("checked");
				found = chk != undefined && chk != false;
			}			
			return found;
		},
		
		_isRadioButton : function(inp) {
			return inp.attr("type") == "radio";
		},
		
		_resetRadio : function(inp, searchValue) {
			// inp is the array of radio buttons that have the same name 
			for (var i = 0; i < inp.length; i++) {
				var radio = $(inp[i]);
				if (radio.val() == searchValue) {
					radio.attr("checked", "checked");
					break;
				}
			}
		},
		
		_isWorthyOfStorage : function(inp) {
			var name = this._getKeyForInputValueStorage(inp);
			return this._isNotNullAndNotUndefined(name) && name.length > 0;
		},
		
		_getValueOfInput : function(inp) {
			var val = "";
			if (this._isCheckBox(inp)) {
				if (inp.is(':checked')) {
					val = "true";
				} else {
					val = "false";
				}
			}
			if (val == "") {
				val = inp.val();
				if (val == null) {
					val = "";
				}
			}
			return val;
		},
		
		_isCheckBox : function(inp) {
			return inp.attr("type") == "checkbox";
		},
		
		_prepId : function(id) {
			if (this._isNullOrUndefined(id)) { return ""; }
			
			if (id.indexOf("#") < 0) {
				id = "#" + id;
			}
			return id;
		},
		
		_isNullOrUndefined : function(obj) {
			return obj == null || obj == undefined;
		},
		
		_isNotNullAndNotUndefined : function(obj) {
			return obj != undefined && obj != null;
		},
		
		_escapeValue : function(str) {
			str = str.replace(/\+/g,"\\+");
			str = str.replace(/\\/g,"\\");
			str = str.replace(/\//g,"\\/");
			str = str.replace(/!/g,"\\!");
			str = str.replace(/"/g,'\\"');
			str = str.replace(/#/g,"\\#");
			str = str.replace(/\$/g,"\\$");
			str = str.replace(/%/g,"\\%");
			str = str.replace(/&/g,"\\&");
			str = str.replace(/'/g,"\\'");
			str = str.replace(/\(/g,"\\(");
			str = str.replace(/\)/g,"\\)");
			str = str.replace(/\*/g,"\\*");
			str = str.replace(/,/g,"\\,");
			str = str.replace(/\./g,"\\.");
			str = str.replace(/:/g,"\\:");
			str = str.replace(/;/g,"\\;");
			str = str.replace(/\?/g,"\\?");
			str = str.replace(/@/g,"\\@");
			str = str.replace(/\[/g,"\\[");
			str = str.replace(/\]/g,"\\]");
			str = str.replace(/\^/g,"\\^");
			str = str.replace(/`/g,"\\`");
			str = str.replace(/\{/g,"\\{");
			str = str.replace(/\}/g,"\\}");
			str = str.replace(/\|/g,"\\|");
			str = str.replace(/\~/g,"\\~");
			
			return str;
		},

	});
	
	$.extend( $.dtg.modificationHighlighter, {
		version: "1.0.0"
	});
}(jQuery));
