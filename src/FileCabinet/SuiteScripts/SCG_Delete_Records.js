/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * Version  Date            Author           Description
 * 1.00     28 Jan 2021     Josh Westbury    Used for Integration Testing - Deletes Customer and all child records
 *                                           Use JSON Requestbody {"custId": "43063"} via POSTMAN POST request
 *
 *
 */

define(['N/log', 'N/record', 'N/error', 'N/search'], function (
    log,
    record,
    error,
    search
) {
    function deleteRecords(requestBody) {
        log.debug('REQUESTBODY', requestBody);
        try {
            var custId = requestBody.custId;
            deleteContacts(custId);
            deleteChargeRecs(custId);
            deleteSubItems(custId);
            deleteSubscription(custId);
            deleteSubCustomers(custId);
            record.delete({ type: 'customer', id: custId });
            return 'DELETE PROCESS COMPLETE';
        } catch (err) {
            throw error.create({
                name: `ERROR OCCURRED`,
                message: err.message,
            });
        }
    }

    var deleteChargeRecs = (custId) => {
        var chargeRecs = [];
        var chargeSearch = search.create({
            type: 'customrecordzab_charge',
            filters: [['custrecordzab_c_customer', 'anyof', custId]],
            columns: [
                search.createColumn({
                    name: 'internalid',
                    sort: search.Sort.ASC,
                    label: 'Internal ID',
                }),
            ],
        });
        chargeSearch.run().each(function (result) {
            var id = result.getValue({ name: 'internalid' });
            chargeRecs.push(id);
            return true;
        });

        if (chargeRecs.length > 0) {
            chargeRecs.forEach((id) => {
                record.delete({
                    type: 'customrecordzab_charge',
                    id: id,
                });
            });
            log.debug('CHARGE RECS DELETED');
        }
    };

    var deleteSubscription = (custId) => {
        var subRec = [];
        var subSearch = search.create({
            type: 'customrecordzab_subscription',
            filters: [['custrecordzab_s_customer', 'anyof', custId]],
            columns: [
                search.createColumn({
                    name: 'internalid',
                    sort: search.Sort.ASC,
                    label: 'Internal ID',
                }),
            ],
        });
        subSearch.run().each(function (result) {
            var id = result.getValue({ name: 'internalid' });
            subRec.push(id);
            return true;
        });

        if (subRec.length > 0) {
            subRec.forEach((id) => {
                record.delete({ type: 'customrecordzab_subscription', id: id });
            });
            log.debug('Subscription Deleted');
        }
    };

    var deleteSubItems = (custId) => {
        var subItems = [];
        var subItemSearch = search.create({
            type: 'customrecordzab_subscription_item',
            filters: [['custrecordzab_si_customer', 'anyof', custId]],
            columns: [
                search.createColumn({
                    name: 'internalid',
                    sort: search.Sort.ASC,
                    label: 'Internal ID',
                }),
            ],
        });
        subItemSearch.run().each(function (result) {
            var id = result.getValue({ name: 'internalid' });
            subItems.push(id);
            return true;
        });

        if (subItems.length > 0) {
            subItems.forEach((id) => {
                record.delete({
                    type: 'customrecordzab_subscription_item',
                    id: id,
                });
            });
            log.debug('SUB ITEMS DELETED');
        }
    };

    var deleteSubCustomers = (custId) => {
        var subCustIds = [];
        var subCustSearch = search.create({
            type: 'customer',
            filters: [['parent', 'anyof', custId]],
            columns: [
                search.createColumn({
                    name: 'internalid',
                    sort: search.Sort.ASC,
                    label: 'Internal ID',
                }),
            ],
        });
        subCustSearch.run().each(function (result) {
            var id = result.getValue({ name: 'internalid' });
            subCustIds.push(id);
            return true;
        });

        log.debug('SUB CUST IDS', subCustIds);
        log.debug('CUST ID', custId);

        if (subCustIds.length > 0) {
            subCustIds.forEach((id) => {
                if (id !== custId) {
                    record.delete({ type: 'customer', id: id });
                }
            });
            log.debug('SUB CUSTOMERS DELETED');
        }
    };

    var deleteContacts = (custId) => {
        var contactIds = [];
        var contactSearchObj = search.create({
            type: 'contact',
            filters: [['company', 'anyof', custId]],
            columns: [
                search.createColumn({
                    name: 'internalid',
                    sort: search.Sort.ASC,
                    label: 'Internal ID',
                }),
            ],
        });
        contactSearchObj.run().each(function (result) {
            var id = result.getValue({ name: 'internalid' });
            contactIds.push(id);
            return true;
        });

        if (contactIds.length > 0) {
            contactIds.forEach((id) => {
                record.delete({ type: 'contact', id: id });
            });
            log.debug('CONTACTS DELTED');
        }
    };

    return { post: deleteRecords };
});
