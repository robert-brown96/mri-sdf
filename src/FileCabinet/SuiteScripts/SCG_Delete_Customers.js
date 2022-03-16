/**
 *@NApiVersion 2.1
 *@NScriptType MassUpdateScript
 *
 * Version  Date            Author           Description
 * 1.00     28 Jan 2021     Josh Westbury    Deletes Customer Records
 *
 *
 */
define(['N/record'], function (record) {
    function each(params) {
        record.delete({
            type: record.Type.CUSTOMER,
            id: params.id,
        });
    }
    return {
        each: each,
    };
});
