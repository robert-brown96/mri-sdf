/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 Jan 2020     Doug Humberd	   Send email to dunning email or invoice email address list using the template parameter given on the workflow action
 *                                             CC addresses stored / configured within the WF Action script
 * 1.10       02 Mar 2020     Doug Humberd     Add logic to attach QuickBooks Invoice to email if the "Use QuickBooks Invoice" checkbox is checked on the invoice
 *
 */

/**
 * Constants
 */

//const ACCOUNTS_RECEIVABLE_EMPLOYEE = '4224';
//const REPLY_TO_EMAIL = 'accounts.receivable@company.com';

/**
 * Populates the Free FOrm Address field on the WF Send Email action
 * 
 * @returns {Void} Any or no return value
 */
function cs_dunning_email_workflowAction() {
	try{
		
		// Initialize Values
		var transId = nlapiGetRecordId();
		var transType = nlapiGetRecordType();
		var transRec = nlapiLoadRecord(transType, transId);
		var customerId = transRec.getFieldValue('entity');
		var dunningEmail = transRec.getFieldValue('custbody_invoice_email_address_list_2');
		var acctExec = transRec.getFieldValue('custbody_scg_a_exec');
		//var useQuickBooksInv = transRec.getFieldValue('custbody_scg_use_quickbooks_invoice');
		//var rvp = transRec.getFieldValue('custbody_rvpso');
		//var csr = transRec.getFieldValue('custbody_csa');
		var recipient = null;
		var cc = null;
		
		nlapiLogExecution('DEBUG', 'Initialize Values', 'Record Type: ' + transType + " Record Id: " + transId + ' Customer Id: ' + customerId + ' Dunning Email: '+ dunningEmail);
		
		// Get Parameters
		var emailTemplate = nlapiGetContext().getSetting('SCRIPT', 'custscript_dunning_email_template');
		var emailAuthor = nlapiGetContext().getSetting('SCRIPT', 'custscript_dunning_email_author');
		var ccAcctExec = nlapiGetContext().getSetting('SCRIPT', 'custscript_cc_acct_exec');
		//var ccRVP = nlapiGetContext().getSetting('SCRIPT', 'custscript_cc_rvp');
		//var ccCSR = nlapiGetContext().getSetting('SCRIPT', 'custscript_cc_csr');
		var addlEmailCC1 = nlapiGetContext().getSetting('SCRIPT', 'custscript_addl_email_cc_1');
		var addlEmailCC2 = nlapiGetContext().getSetting('SCRIPT', 'custscript_addl_email_cc_2');
		var addlEmailCC3 = nlapiGetContext().getSetting('SCRIPT', 'custscript_addl_email_cc_3');
		var addlEmailCC4 = nlapiGetContext().getSetting('SCRIPT', 'custscript_addl_email_cc_4');
		//var addlEmailCC5 = nlapiGetContext().getSetting('SCRIPT', 'custscript_addl_email_cc_5');
		
		
		//if (useQuickBooksInv == 'T'){
        	//var searchresults = getQuickBooksPDF(transId);
        	//if (searchresults){
        		//var qbFile = searchresults[0].getValue('internalid', 'file');
        		//nlapiLogExecution('DEBUG', 'QuickBooks File Id', qbFile);
        		//var pdfFile = nlapiLoadFile(qbFile);
        	//}else{
        		//var pdfFile = nlapiPrintRecord('TRANSACTION', transId, 'PDF', null);
        	//}
        //}else{
    	var pdfFile = nlapiPrintRecord('TRANSACTION', transId, 'PDF', null);
        //}
		
		// Merge email
		var emailMerger = nlapiCreateEmailMerger(emailTemplate);
		emailMerger.setTransaction(transId);
		emailMerger.setEntity('customer',customerId);
		
		var mailRec = emailMerger.merge();
		var emailSubject = mailRec.getSubject();
		var emailBody = mailRec.getBody();
		
		nlapiLogExecution('DEBUG', 'Email Template', 'Template: '+ emailTemplate+ ' Subject: '+emailSubject);
		
		// If the dunning email has a value then send email to it
		if(dunningEmail != null && dunningEmail != ""){
			
			// Set recipient
			recipient = dunningEmail;
			
			nlapiLogExecution('DEBUG', 'Recipient Set to Dunning Email', 'Recipient Set to Dunning Email: '+ recipient);
			
			
		} else{
			
			nlapiLogExecution('DEBUG', 'No Dunning Email', 'No Dunning Email');
			
			var invEmails = transRec.getFieldValue('custbody_invoice_email_address_list');
			
			// If Invoice Email Address List is null then end script
			if (invEmails == null){
				return;
			}
			
			nlapiLogExecution('DEBUG', 'Initial Invoice Emails', invEmails);
			
			// Invoice Emails may have spaces or ; between emails, replace these with a comma
			invEmails = invEmails.replace(", ", ",");
			invEmails = invEmails.replace(" ", ",");
			invEmails = invEmails.replace(";", ",");
			
			nlapiLogExecution('DEBUG', 'After Replace', invEmails);
			
			recipient = invEmails.split(",");
			
			nlapiLogExecution('DEBUG', 'Recipient Set to Array', 'Array: '+ recipient + ' Recipient Array length: ' + recipient.length);
			
		}
		
		//Determine if any additional emails are to be cc'd
		var additionalEmails = null;
		
		if (ccAcctExec == 'T' && (acctExec != '' && acctExec != null)){
			var acctExecEmail = acctExec;
			if (additionalEmails == null){
				additionalEmails = acctExecEmail;
			}else{
				additionalEmails = additionalEmails + ',' + acctExecEmail;
			}
		}
		
		//if (ccRVP == 'T' && (rvp != '' && rvp != null)){
			//var rvpEmail = nlapiLookupField('employee', rvp, 'email');
			//if (additionalEmails == null){
				//additionalEmails = rvpEmail;
			//}else{
				//additionalEmails = additionalEmails + ',' + rvpEmail;
			//}
		//}
		
		//if (ccCSR == 'T' && (csr != '' && csr != null)){
			//var csrEmail = nlapiLookupField('employee', csr, 'email');
			//if (additionalEmails == null){
				//additionalEmails = csrEmail;
			//}else{
				//additionalEmails = additionalEmails + ',' + csrEmail;
			//}
		//}
		
		if (addlEmailCC1 != '' && addlEmailCC1 != null){
			var addlCC1Email = nlapiLookupField('employee', addlEmailCC1, 'email');
			if (additionalEmails == null){
				additionalEmails = addlCC1Email;
			}else{
				additionalEmails = additionalEmails + ',' + addlCC1Email;
			}
		}
		
		if (addlEmailCC2 != '' && addlEmailCC2 != null){
			var addlCC2Email = nlapiLookupField('employee', addlEmailCC2, 'email');
			if (additionalEmails == null){
				additionalEmails = addlCC2Email;
			}else{
				additionalEmails = additionalEmails + ',' + addlCC2Email;
			}
		}
		
		if (addlEmailCC3 != '' && addlEmailCC3 != null){
			var addlCC3Email = nlapiLookupField('employee', addlEmailCC3, 'email');
			if (additionalEmails == null){
				additionalEmails = addlCC3Email;
			}else{
				additionalEmails = additionalEmails + ',' + addlCC3Email;
			}
		}
		
		if (addlEmailCC4 != '' && addlEmailCC4 != null){
			var addlCC4Email = nlapiLookupField('employee', addlEmailCC4, 'email');
			if (additionalEmails == null){
				additionalEmails = addlCC4Email;
			}else{
				additionalEmails = additionalEmails + ',' + addlCC4Email;
			}
		}
		
		//if (addlEmailCC5 != '' && addlEmailCC5 != null){
			//var addlCC5Email = nlapiLookupField('employee', addlEmailCC5, 'email');
			//if (additionalEmails == null){
				//additionalEmails = addlCC5Email;
			//}else{
				//additionalEmails = additionalEmails + ',' + addlCC5Email;
			//}
		//}
		
		if (additionalEmails != null){
			cc = additionalEmails.split(",");
		}
		
		if (cc != null){
			nlapiLogExecution('DEBUG', 'CCs Set to Array', 'Array: '+ cc + ' CCs Array length: ' + cc.length);
		}else{
			nlapiLogExecution('DEBUG', 'No CCs', 'No CCs');
		}
		
		// Send Email if there is a recipient
		if(recipient != null){
			
			var records = new Object();
			records['transaction'] = transId;
			
			//nlapiSendEmail(ACCOUNTS_RECEIVABLE_EMPLOYEE, recipient, emailSubject, emailBody, null, null, records, pdfFile, true, false, REPLY_TO_EMAIL);
			nlapiSendEmail(emailAuthor, recipient, emailSubject, emailBody, cc, null, records, pdfFile, true, false);
		
			nlapiLogExecution('DEBUG', 'Send Email', 'Email sent to recipient (' + recipient + ') with email subject (' + emailSubject + ') and email body (' + emailBody + ')');
		}
		
		
	} catch(e) {
		kh_email_logError(e);
		throw e;
	}
	
}


/*
function getQuickBooksPDF(transId){
	
	//Define filters
	var filters = new Array();
	filters.push(new nlobjSearchFilter('internalid', null, 'anyof', transId));
	//filters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
	  
	// Define columns
	var columns = new Array();
	columns.push(new nlobjSearchColumn('internalid', 'file', null));
	  
	// Get results
	var results = nlapiSearchRecord('invoice', null, filters, columns);
	  
	// Return
	return results;
	
}
*/



/**
 * Writes an error message to the Script Execution Log
 * 
 * @param {nlobjError} e - The NetSuite Error object passed in from the calling function
 * 
 * @returns {Void}
 */
function kh_email_logError(e) {
	// Log the error based on available details
	if (e instanceof nlobjError) {
		nlapiLogExecution('ERROR', 'System Error', e.getCode() + '\n' + e.getDetails());
	} else {
		nlapiLogExecution('ERROR', 'Unexpected Error', e.toString());
	}
}