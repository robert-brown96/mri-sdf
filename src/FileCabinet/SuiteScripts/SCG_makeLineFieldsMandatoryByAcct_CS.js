/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       24 Sep 2020     Doug Humberd     Makes Department, Class, or Name fields mandatory if the Income Account for the item is appropriately checked
 * 1.05       06 Oct 2020     Doug Humberd     Removed 'Location' code.  Added new popup control that one field is blank if the other is mandatory
 *
 */

/**
 * Constants
 */

 /**
 * Logs an exception to the script execution log
 *
 * @appliedtorecord salesorder invoice creditmemo
 *
 * @param {String} e Exception
 * @returns {Void}
 */
function scg_mlfm_logError (e) {
	// Log the error based on available details
	if (e instanceof nlobjError) {
		nlapiLogExecution('ERROR', 'System Error',
			e.getCode() + '\n' + e.getDetails());
		alert(e.getCode() + '\n' + e.getDetails());
	} else {
		nlapiLogExecution('ERROR', 'Unexpected Error', e.toString());
		alert(e.toString());
	}
}

/**
 * Performs actions once the page is fully loaded in the browser
 *
 * @param {String} type Operation types: create, copy, edit
 * @returns {Void}
 */
function scg_mlfm_pageInit (type) {
	try {
		//scg_mlfm_pageInitFunction(type);
	} catch (e) {
		scg_mlfm_logError(e);
		throw e;
	}
}

/**
 * Performs actions when a field is changed in the user's browser
 *
 * @appliedtorecord salesorder invoice creditmemo
 *
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function scg_mlfm_fieldChanged (type, name, linenum) {
	try {
		//scg_mlfm_fieldChangedFunction(type, name, linenum);
	} catch (e) {
		scg_mlfm_logError(e);
		throw e;
	}
}

/**
 * Performs actions following a field change after all of the field's
 * child field values are sourced from the server.
 *
 * @param {String} name The name of the field that changed
 * @param {String} type The sublist type
 * @returns {Void}
 */
function scg_mlfm_postSourcing (name, type) {
	try {
		//scg_mlfm_postSourcingFunction(name, type);
	} catch (e) {
		scg_mlfm_logError(e);
		throw e;
	}
}



/**
 * Performs actions prior to a line being added to a sublist
 *
 * @param {String} type - the sublist internal id
 * @returns {Void}
 */
function scg_mlfm_validateLine(type) {
	try {
		var retValue = false;
		retValue = scg_mlfm_makeLineFieldsMandatory(type);
		//retValue = (retValue) ? true /* replace with additional function_name() */ : false;
		//scg_mlfm_validateLineFunction(type);
		return retValue;
	} catch (e) {
		scg_mlfm_logError(e);
		throw e;
	}
}



/**
 * Performs actions after a line is added to a sublist
 *
 * @param {String} type - the sublist internal id
 * @returns {Void}
 */
function scg_mlfm_recalc(type) {
	try {
		//scg_mlfm_recalcFunction(type);
	} catch (e) {
		scg_mlfm_logError(e);
		throw e;
	}
}






/**
 * Handles validation prior to the form being submitted to the server
 *
 * @returns {Boolean}
 */
function scg_mlfm_saveRecord () {
	try {
		var retVal = false;
		//retVal = scg_mlfm_saveRecordFunction();
		//retVal = (retVal) ? true /* replace with additional function_name() */ : false;
		return retVal;
	} catch (e) {
		scg_mlfm_logError(e);
		throw e;
	}
}




function isEmpty (stValue) {
	if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
		return true;
	}

	return false;
}  



/**
 * Alerts user if the Name field is empty on a line where Account Type = Accounts Receivable
 *
 * @appliedtorecord salesorder invoice creditmemo
 *
 */
function scg_mlfm_makeLineFieldsMandatory(type){
	
	var recType = nlapiGetRecordType();
	//alert ('Record Type = ' + recType);
	
	var subsidiary = nlapiGetFieldValue('subsidiary');
	//alert ('Subsidiary = ' + subsidiary);
	
	//var reqFields;
	//var missing = 'F';
	
	if (recType == 'salesorder' || recType == 'invoice' || recType == 'creditmemo'){
		
		//alert(recType + ' code');
		var item = nlapiGetCurrentLineItemValue('item', 'item');
		//alert('item = ' + item);
		
		var itemSearch = getIncAcct(item);
		
		if (itemSearch){
			var account = itemSearch[0].getValue('incomeaccount');
			//alert ('Income Account = ' + account);
			
			var acctRec = nlapiLoadRecord('account', account);
			var acctType = acctRec.getFieldValue('accttype');
			//alert ('Account = ' + account + '\nAccount Type = ' + acctType);
			
			var deptMand = acctRec.getFieldValue('custrecord_scg_make_dept_mandatory');
			var classMand = acctRec.getFieldValue('custrecord_scg_make_class_mandatory');
			//var locMand = acctRec.getFieldValue('custrecord_scg_make_location_mandatory');
			//alert ('Dept Mandatory: ' + deptMand + '\nClass Mandatory: ' + classMand + '\nLocation Mandatory: ' + locMand);
			
			var dept = nlapiGetCurrentLineItemValue('item', 'department');
			var cls = nlapiGetCurrentLineItemValue('item', 'class');
			//var loc = nlapiGetCurrentLineItemValue('item', 'location');
			//alert ('Dept: ' + dept + '\nClass: ' + cls + '\nLocation: ' + loc);
			
			var lineNumber = nlapiGetCurrentLineItemValue('item', 'line');
			
			if (dept != null){
				
				var deptFieldObj = nlapiGetLineItemField('item', 'department', lineNumber);
				var deptLabel = deptFieldObj.getLabel();
				//alert ('Dept Label = ' + deptLabel);
				
				if (deptMand == 'T' && isEmpty(dept)){
					
					//missing = 'T';
					//if (isEmpty(reqFields)){
						//reqFields = deptLabel;
					//}else{
						//reqFields = reqFields + '\n' + deptLabel;
					//}
					
					alert ('\nThe ' + deptLabel + ' field is required for this line.\n\nPlease enter an appropriate value.\n');
					
					retValue = false;
					return retValue;
					
				}//End if (deptMand == 'T' && isEmpty(dept))
				
				if (deptMand == 'T' && !isEmpty(cls)){
					
					var clsFieldObj = nlapiGetLineItemField('item', 'class', lineNumber);
					var clsLabel = clsFieldObj.getLabel();
					
					alert ('\nThe ' + clsLabel + ' field must be blank when ' + deptLabel + ' is required.\n\nPlease remove this value before continuing.\n');
					
					retValue = false;
					return retValue;
					
				}//End if (deptMand == 'T' && !isEmpty(cls))
				
			}//End if (dept != null)
			
			if (cls != null){
				
				var clsFieldObj = nlapiGetLineItemField('item', 'class', lineNumber);
				var clsLabel = clsFieldObj.getLabel();
				//alert ('Class Label = ' + clsLabel);
				
				if (classMand == 'T' && isEmpty(cls)){
					
					//missing = 'T';
					//if (isEmpty(reqFields)){
						//reqFields = clsLabel;
					//}else{
						//reqFields = reqFields + '\n' + clsLabel;
					//}
					
					alert ('\nThe ' + clsLabel + ' field is required for this line.\n\nPlease enter an appropriate value.\n');
					
					retValue = false;
					return retValue;
					
				}//End if (classMand == 'T' && isEmpty(cls))
				
				if (classMand == 'T' && !isEmpty(dept) && acctType != 'COGS'){
					
					var deptFieldObj = nlapiGetLineItemField('item', 'department', lineNumber);
					var deptLabel = deptFieldObj.getLabel();
					
					alert ('\nThe ' + deptLabel + ' field must be blank when ' + clsLabel + ' is required.\n\nPlease remove this value before continuing.\n');
					
					retValue = false;
					return retValue;
					
				}//End if (deptMand == 'T' && !isEmpty(cls))
				
			}//End if (cls != null)
			
			
			
			//if (missing == 'T'){
				
				//alert ('\nThe following fields are required for this line.\n\n' + reqFields + '\n\nPlease enter appropriate values.\n');
				
				//retValue = false;
				//return retValue;
				
			//}
			
		}//End if (itemSearch)
			
	}//End if (recType == 'salesorder' || recType == 'invoice' || recType == 'creditmemo')
	
	
	if (recType == 'journalentry' || recType == 'advintercompanyjournalentry'){
		
		//alert(recType + ' code');
		
		var account = nlapiGetCurrentLineItemValue('line', 'account');
		//alert ('Account = ' + account);
		
		var acctRec = nlapiLoadRecord('account', account);
      var acctType = acctRec.getFieldValue('accttype');
		
		var deptMand = acctRec.getFieldValue('custrecord_scg_make_dept_mandatory');
		var classMand = acctRec.getFieldValue('custrecord_scg_make_class_mandatory');
		//var locMand = acctRec.getFieldValue('custrecord_scg_make_location_mandatory');
		//alert ('Dept Mandatory: ' + deptMand + '\nClass Mandatory: ' + classMand);
		
		var dept = nlapiGetCurrentLineItemValue('line', 'department');
		var cls = nlapiGetCurrentLineItemValue('line', 'class');
		//var loc = nlapiGetCurrentLineItemValue('line', 'location');
		//alert ('Dept: ' + dept + '\nClass: ' + cls);
		
		//var lineNumber = nlapiGetCurrentLineItemValue('line', 'lineuniquekey');
		var lineNumber = nlapiGetCurrentLineItemValue('line', 'line');
		//alert ('lineNumber = ' + lineNumber);
		
		
		if (dept != null){
			
			var deptFieldObj = nlapiGetLineItemField('line', 'department', lineNumber);
			var deptLabel = deptFieldObj.getLabel();
			
			if (deptMand == 'T' && isEmpty(dept)){
				
				//missing = 'T';
				//if (isEmpty(reqFields)){
					//reqFields = deptLabel;
				//}else{
					//reqFields = reqFields + '\n' + deptLabel;
				//}
				
				alert ('\nThe ' + deptLabel + ' field is required for this line.\n\nPlease enter an appropriate value.\n');
				
				retValue = false;
				return retValue;
				
			}//End if (deptMand == 'T' && isEmpty(dept))
			
			if (deptMand == 'T' && !isEmpty(cls) && acctType != 'COGS'){
				
				var clsFieldObj = nlapiGetLineItemField('line', 'class', lineNumber);
				var clsLabel = clsFieldObj.getLabel();
				
				alert ('\nThe ' + clsLabel + ' field must be blank when ' + deptLabel + ' is required.\n\nPlease remove this value before continuing.\n');
				
				retValue = false;
				return retValue;
				
			}//End if (deptMand == 'T' && !isEmpty(cls))
			
		}//End if (dept != null)
		
		if (cls != null){
			
			var clsFieldObj = nlapiGetLineItemField('line', 'class', lineNumber);
			var clsLabel = clsFieldObj.getLabel();
			//alert ('Class Label = ' + clsLabel);
			
			if (classMand == 'T' && isEmpty(cls)){
				
				//missing = 'T';
				//if (isEmpty(reqFields)){
					//reqFields = clsLabel;
				//}else{
					//reqFields = reqFields + '\n' + clsLabel;
				//}
				
				alert ('\nThe ' + clsLabel + ' field is required for this line.\n\nPlease enter an appropriate value.\n');
				
				retValue = false;
				return retValue;
				
			}//End if (classMand == 'T' && isEmpty(cls))
			
			if (classMand == 'T' && !isEmpty(dept)){
				
				var deptFieldObj = nlapiGetLineItemField('line', 'department', lineNumber);
				var deptLabel = deptFieldObj.getLabel();
				
				alert ('\nThe ' + deptLabel + ' field must be blank when ' + clsLabel + ' is required.\n\nPlease remove this value before continuing.\n');
				
				retValue = false;
				return retValue;
				
			}//End if (deptMand == 'T' && !isEmpty(cls))
			
		}//End if (cls != null)
		
		
		//if (missing == 'T'){
			
			//alert ('\nThe following fields are required for this line.\n\n' + reqFields + '\n\nPlease enter appropriate values.\n');
			
			//retValue = false;
			//return retValue;
			
		//}

		
	}//End if (recType == 'journalentry' || recType == 'advintercompanyjournalentry')
	
	
	
	if (recType == 'vendorbill'){
		
	//	alert ('type = ' + type);
		
		//retValue = false;//TEMP
		//return retValue;//TEMP
		
		//alert(recType + ' code');
		
		if (type == 'item'){
			
			var item = nlapiGetCurrentLineItemValue(type, 'item');
			//alert('item = ' + item);
			
			var itemSearch = getIncAcct(item);
			
			if (itemSearch){
				var account = itemSearch[0].getValue('incomeaccount');
				//alert ('Income Account = ' + account);
				
				var acctRec = nlapiLoadRecord('account', account);
				//var acctType = acctRec.getFieldValue('accttype');
				//alert ('Account = ' + account + '\nAccount Type = ' + acctType);
				
				var deptMand = acctRec.getFieldValue('custrecord_scg_make_dept_mandatory');
				var classMand = acctRec.getFieldValue('custrecord_scg_make_class_mandatory');
				//var locMand = acctRec.getFieldValue('custrecord_scg_make_location_mandatory');
				//alert ('Dept Mandatory: ' + deptMand + '\nClass Mandatory: ' + classMand + '\nLocation Mandatory: ' + locMand);
				
			}

			
		}//End if (type == 'item')
		
		if (type == 'expense'){
			
			var account = nlapiGetCurrentLineItemValue(type, 'account');
			//alert ('Account = ' + account);
			
			var acctRec = nlapiLoadRecord('account', account);
			
			var deptMand = acctRec.getFieldValue('custrecord_scg_make_dept_mandatory');
			var classMand = acctRec.getFieldValue('custrecord_scg_make_class_mandatory');
			//var locMand = acctRec.getFieldValue('custrecord_scg_make_location_mandatory');
			//alert ('Dept Mandatory: ' + deptMand + '\nClass Mandatory: ' + classMand);

			
		}// End if (type == 'expense')
		
		
		
		var dept = nlapiGetCurrentLineItemValue(type, 'department');
		var cls = nlapiGetCurrentLineItemValue(type, 'class');
		//var loc = nlapiGetCurrentLineItemValue(type, 'location');
		//alert ('Dept: ' + dept + '\nClass: ' + cls);
		
		var lineNumber = nlapiGetCurrentLineItemValue(type, 'line');
		
		if (dept != null){
			
			var deptFieldObj = nlapiGetLineItemField(type, 'department', lineNumber);
			var deptLabel = deptFieldObj.getLabel();
			//alert ('Dept Label = ' + deptLabel);
			
			if (deptMand == 'T' && isEmpty(dept)){
				
				//missing = 'T';
				//if (isEmpty(reqFields)){
					//reqFields = deptLabel;
				//}else{
					//reqFields = reqFields + '\n' + deptLabel;
				//}
				
				alert ('\nThe ' + deptLabel + ' field is required for this line.\n\nPlease enter an appropriate value.\n');
				
				retValue = false;
				return retValue;
				
			}//End if (deptMand == 'T' && isEmpty(dept))
			
			if (deptMand == 'T' && !isEmpty(cls)){
				
				var clsFieldObj = nlapiGetLineItemField(type, 'class', lineNumber);
				var clsLabel = clsFieldObj.getLabel();
				
				alert ('\nThe ' + clsLabel + ' field must be blank when ' + deptLabel + ' is required.\n\nPlease remove this value before continuing.\n');
				
				retValue = false;
				return retValue;
				
			}//End if (deptMand == 'T' && !isEmpty(cls))
			
		}//End if (dept != null)
		
		if (cls != null){
			
			var clsFieldObj = nlapiGetLineItemField(type, 'class', lineNumber);
			var clsLabel = clsFieldObj.getLabel();
			//alert ('Class Label = ' + clsLabel);
			
			if (classMand == 'T' && isEmpty(cls)){
				
				//missing = 'T';
				//if (isEmpty(reqFields)){
					//reqFields = clsLabel;
				//}else{
					//reqFields = reqFields + '\n' + clsLabel;
				//}
				
				alert ('\nThe ' + clsLabel + ' field is required for this line.\n\nPlease enter an appropriate value.\n');
				
				retValue = false;
				return retValue;
				
			}//End if (classMand == 'T' && isEmpty(cls))
			
			if (classMand == 'T' && !isEmpty(dept)){
				
				var deptFieldObj = nlapiGetLineItemField('item', 'department', lineNumber);
				var deptLabel = deptFieldObj.getLabel();
				
				alert ('\nThe ' + deptLabel + ' field must be blank when ' + clsLabel + ' is required.\n\nPlease remove this value before continuing.\n');
				
				retValue = false;
				return retValue;
				
			}//End if (deptMand == 'T' && !isEmpty(cls))
			
		}//End if (cls != null)
			
			
			
	}//End if (recType == 'vendorbill')
	
	
	retValue = true;
	return retValue;
	
}





function getIncAcct(item){
	
	//Define filters
	var filters = new Array();
	filters.push(new nlobjSearchFilter('internalid', null, 'anyof', item));
	  
	// Define columns
	var columns = new Array();
	columns.push(new nlobjSearchColumn('internalid', null, null));
	columns.push(new nlobjSearchColumn('incomeaccount', null, null));
	  
	// Get results
	var results = nlapiSearchRecord('item', null, filters, columns);
	  
	// Return
	return results;
	
}





