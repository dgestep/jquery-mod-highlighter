/*!
 * jQuery Modification Highlighter
 * Author: Doug Estep - Dayton Technology Group.
 * Version 1.0.0 bump
 * 
 * API Documentation: 
 *   http://dougestep.com/dme/jquery-modification-highlighter-widget 
 * 
 * Depends:
 *   jquery 1.7.1 +
 *   jquery-ui 1.8.20+ using the following plugins.
 *     jQuery UI widget factory
 */
(function($, undefined) {
	var classModHighlighterContainer = "hasModificationHighlighter";
	var panelsIgnoreModified = "panels-ignore-modified";
	var panelsEvaluateModified = "panels-evaluate-modified";
	var classTrackerInputModifiable = "tracker-input-modifiable";
	var classModifiedFlag = "tracker-input-modified";
	var dataTrackerOriginalValue = "data-tracker-original-value";
	var dataRadioButtonValue = "data-mh-rb-original-value-";
	var dataChangeEventFlag = "modHighlighterChangeEvent";
	
	$.widget("dtg.modificationHighlighter", {
		options: {
			addlSelectableInputTypes : '',
			inputNotModifiedIfHasClass: 'error',
			modifiedColumnClass: "ui-state-highlight",
			modifiedLabelClass: "ui-state-highlight"
		},
		
		_create : function() {
			this._assertContainerHasId();
			this._assertUniqueId();
			
			// store original values
			var containerId = this.element.attr("id");
			this.storeOriginalValues(containerId);
			
			this.element.addClass(classModHighlighterContainer);
		},
		
		_assertContainerHasId : function() {
			var paneId = this.element.attr("id");
			if (this._isNullOrUndefined(paneId) || paneId.length == 0) {
				throw "The container which this plugin is running against must contain an ID attribute.";  
			} 
		},
		
		_assertUniqueId : function() {
			var len = $("#" + this.element.attr("id")).length == 1;
			if (len > 1) {
				throw "The container ID must be unique within the DOM.  There are " + len 
					+ " elements which have the \"" + this.element.attr("id") + "\" ID.";   
			}
		},
		
		_init : function() {
			// define change event on columns that don't already have the event defined for this plugin
			var containerId = this.element.attr("id");
			this._defineChangeEvent(containerId);
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
			var withClasses = [];
			withClasses.push(classModifiedFlag);
			withClasses.push(this.options.inputNotModifiedIfHasClass);
			var selector = this._createSelectorForInputTypes(containerId, withClasses);
			var columns = this._createColumnsUsingSelector(selector);
			return columns;
		},
		
		/**
		 * Returns an array of column objects where the column has the supplied CSS class associated with it within the supplied container. 
		 * @param containerId the ID value for the internal container which contains the input-type objects to evaluate. Supplying
		 * null, undefined, or not suppling a value will result in the entire container being evaluated.
		 * @param className the class name to search for.
		 */
		getAllColumnsWithSuppliedClass : function(containerId, className) {
			var columns = [];
			if (this._isNullOrUndefined(className)) { return columns; }
			
			var withClasses = [];
			withClasses.push(className);
			var selector = this._createSelectorForInputTypes(containerId, withClasses);
			columns = this._createColumnsUsingSelector(selector);
			return columns;
		},
		
		/**
		 * Returns an array of column objects stored upon load for the supplied container.  
		 * @param containerId the ID value for the internal container which contains the input-type objects to evaluate. Supplying
		 * null, undefined, or not suppling a value will result in the entire container being evaluated.
		 */
		getStoredInputColumns : function(containerId) {
			var withClasses = [];
			withClasses.push(classTrackerInputModifiable);
			var selector = this._createSelectorForInputTypes(containerId, withClasses);
			var columns = this._createColumnsUsingSelector(selector);
			return columns;
		},
		
		_createColumnsUsingSelector : function(selector) {
			var columns = [];
			var plugin = this;
			$(selector).each(function() {
				var inp = $(this);
				
				var id = plugin._getKeyForInputValueStorage(inp);
				var labelText = plugin._getLabelTextForInputId(id);
				var currentValue = plugin._getValueOfInput(inp);
				
				if (plugin._tempStoreUncheckedRadioButtonOriginalValue(inp)) {
					// unchecked radio button. original value is temporarily stored in order to apply to column object
					return true;
				}
				
				var originalValue = inp.data(dataTrackerOriginalValue);
				var column = plugin._createColumnStructure(id, currentValue, originalValue, labelText);
				columns.push(column);
			});
			
			// obtain radio button original values
			this._storeRadioButtonOriginalValueOnColumns(columns);
			// clean up
			this._removeTempStoreUncheckedRadioButtonOriginalValue();
			
			return columns;
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
		
		_tempStoreUncheckedRadioButtonOriginalValue : function(inp) {
			if (!this._isRadioButton(inp)) { return false; }
			if (this._isChecked(inp)) { return false; }
			
			var originalValue = inp.data(dataTrackerOriginalValue);
			if (this._isNotNullAndNotUndefined(originalValue)) {
				// originalValue will only have a value if the input was the last checked radio button
				var name = this._getKeyForInputValueStorage(inp);
				var attributeName = dataRadioButtonValue + name;
				this.element.attr(attributeName, originalValue);
			}
			
			return true;
		},
		
		_removeTempStoreUncheckedRadioButtonOriginalValue : function() {
			var element = $('#' + this.element.attr("id"));
			var attributes = $(element[0].attributes);
			attributes.each(function(index) {
				var attribute = this.nodeName;
				if (attribute.indexOf(dataRadioButtonValue) >= 0) {
					element.removeAttr(attribute);
				}
			});
		},
		
		_storeRadioButtonOriginalValueOnColumns : function(columns) {
			for (var i = 0; i < columns.length; i++) {
				var column = columns[i];
				if (columns.originalValue == undefined) {
					var radioOriginalValue = this.element.attr(dataRadioButtonValue + column.id);
					if (this._isNotNullAndNotUndefined(radioOriginalValue)) {
						column.originalValue = radioOriginalValue;
					}
				}
			}
		},
		
		/**
		 * Selects all modified columns and re-executes the "change" event.
		 * @param containerId the ID value for the internal container which contains the input-type objects to evaluate. Supplying
		 * null, undefined, or not suppling a value will result in the entire container being evaluated.
		 */
		evaluate : function(containerId) {
			var withClasses = [];
			withClasses.push(classModifiedFlag);
			withClasses.push(this.options.inputNotModifiedIfHasClass);
			var selector = this._createSelectorForInputTypes(containerId, withClasses);
			$(selector).trigger("change");
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
					var val = this._escapeValue(column.originalValue);
					$("#" + this.element.attr("id") + " input[value='" + val + "']").attr("checked", "checked");
					inp.trigger("change");
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
			var inp = $(this._formatSelectorForContainerId(containerId) + " " + this._prepId(id));
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
			var selector = this._createSelectorForInputTypes(containerId, null);
			var plugin = this;
			$(selector).each(function() {
				var inp = $(this);
				var ignoreModified = plugin._isExceptionToRule(inp, panelsIgnoreModified, panelsEvaluateModified);
				if (ignoreModified) { return true; }
				
				if (plugin._isRadioButton(inp)) {
					if (!inp.is(':checked')) {
						plugin._setInputAsNotModified(inp)
						inp.removeData(dataTrackerOriginalValue);
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
		
		/**
		 * Sets the original values associated to every inputable column associated with the supplied array of column objects.  
		 */
		setOriginalValues : function(containerId, columns) {
			if (this._isNullOrUndefined(columns) || columns.length == 0) { return; }
			
			for (var i = 0; i < columns.length; i++) {
				var column = columns[i];
				var inp = this._findInputObjectByColumn(containerId, column.id);
				if (this._isRadioButton(inp)) {
					for (var j = 0; j < inp.length; j++) {
						var radio = $(inp[j]);
						if (radio.val() == column.originalValue) {
							radio.data(dataTrackerOriginalValue, column.originalValue);
						} else {
							radio.removeData(dataTrackerOriginalValue);
						}
					}
				} else {
					inp.data(dataTrackerOriginalValue, column.originalValue);
				}
				
				inp.trigger("change");
			}
		},
		
		_defineChangeEvent : function(containerId) {
			// defines a listener which listens for a change event for a column 
			// and highlights the column.  Removes the highlight if no longer modified.
			var selector = this._createSelectorForInputTypes(containerId, null);
			var plugin = this;
			$(selector).each(function(index) {
				var inp = $(this);
				if (inp.data(dataChangeEventFlag) == undefined) {
					inp.on("change", function(event) {
						var inp = $(this);
						if (plugin._isIgnoreChange(inp)) {
							// continue with the loop
							return true; 
						}
						
						if (plugin._isModified(inp)) {
							plugin._setInputAsModified(inp);
						} else {
							plugin._setInputAsNotModified(inp);
						}
						
						// fire user event
						var ac = $.Event("afterChange");
						plugin._trigger("afterChange", ac, {
							'element' : this.element,
							'input' : inp
						});
					});
					inp.data(dataChangeEventFlag, "Y");
				}
			});
		},
		
		_isModified : function(inp) {
			var modified = false;
			var originalValue = inp.data(dataTrackerOriginalValue);
			var currentValue = this._getValueOfInput(inp);
			
			if (this._isRadioButton(inp)) {
				var name = this._getKeyForInputValueStorage(inp);
				var containerId = this.element.attr("id");
				var plugin = this;
				$("#" + containerId + " input[name='" + name + "']").each(function(index) {
					var radio = $(this);
					if (plugin._isChecked(radio)) {
						currentValue = radio.val();
					}
					if (radio.data(dataTrackerOriginalValue) != undefined) {
						originalValue = radio.data(dataTrackerOriginalValue);
					}
				});
			}
			
			if (this._isNullOrUndefined(originalValue) && this._isNullOrUndefined(currentValue)) {
				modified = false;
			} else if (this._isNotNullAndNotUndefined(originalValue) && this._isNullOrUndefined(currentValue)) {
				modified = true;
			} else if (this._isNullOrUndefined(originalValue) && this._isNotNullAndNotUndefined(currentValue)) {
				modified = true;
			} else {
				modified = originalValue.toString() != currentValue.toString();
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
		
		_setClass : function(element, className, adding) {
			if (this._isNullOrUndefined(className) || $.trim(className).length == 0) {
				return; 
			}
			if (adding) {
				element.addClass(className);
			} else {
				element.removeClass(className);
			}
		},
		
		_setInputAsModified : function(inp) {
			if (this._isRadioButton(inp)) {
				this._highlightRadio(inp, true);
			} else {
				this._setClass(inp, this.options.modifiedColumnClass, true);
				inp.addClass(classModifiedFlag);
				var label = this._getLabelForInput(inp);
				if (label != null && label.length > 0) {
					this._setClass(label, this.options.modifiedLabelClass, true);
				}
			}
			
			// fire user event
			var miam = $.Event("markInputAsModified");
			this._trigger("markInputAsModified", miam, {
				'element' : this.element,
				'input' : inp
			});
		},
		
		_setInputAsNotModified : function(inp) {
			if (this._isRadioButton(inp)) {
				this._highlightRadio(inp, false);
			} else {
				this._setClass(inp, this.options.modifiedColumnClass, false);
				inp.removeClass(classModifiedFlag);
				var label = this._getLabelForInput(inp);
				if (label != null && label.length > 0) {
					this._setClass(label, this.options.modifiedLabelClass, false);
				}
			}
			
			// fire user event
			var mianm = $.Event("markInputAsNotModified");
			this._trigger("markInputAsNotModified", mianm, {
				'element' : this.element,
				'input' : inp
			});
		},
		
		_highlightRadio : function(inp, highlight) {
			var plugin = this;
			var name = this._getKeyForInputValueStorage(inp);
			var panelId = "#" + this.element.attr("id") + " input[name=" + this._escapeValue(name) + "]";
			$(panelId).each(function(index) {
				var radioInp = $(this);
				if (highlight) {
					plugin._setClass(radioInp, plugin.options.modifiedColumnClass, true);
					radioInp.addClass(classModifiedFlag);
				} else {
					plugin._setClass(radioInp, plugin.options.modifiedColumnClass, false);
					radioInp.removeClass(classModifiedFlag);
				}
				
				var id = radioInp.attr("id");
				if (plugin._isNotNullAndNotUndefined(id)) {
					var label = plugin._getLabelById(id);
					if (label != null && label.length > 0) {
						if (highlight) {
							plugin._setClass(label, plugin.options.modifiedLabelClass, true);
						} else {
							plugin._setClass(label, plugin.options.modifiedLabelClass, false);
						}
					}
				}
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
		
		_isRadioButtonAndChecked : function(inp) {
			return this._isRadioButton(inp) && this._isChecked(inp);
		},
		
		_isChecked : function(inp) {
			var chk = inp.attr("checked");
			return chk != undefined && chk != false;
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
