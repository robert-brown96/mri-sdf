/**
 *@NApiVersion 2.x
 *@NModuleScope Public
 *@NScriptType Suitelet
 *
 * Version          Date            Author              Remarks
 * 2.00             29 Mar 2021     Seungyeon Shin      Allows a user to select Invoices for PDF generation
 *
 */
define([
    "N/log",
    "N/ui/serverWidget",
    "N/record",
    "N/search",
    "N/runtime",
    "N/url",
    "N/redirect",
    "N/error",
    "N/task",
    "N/config"
], function (
    log,
    serverWidget,
    record,
    search,
    runtime,
    url,
    redirect,
    error,
    task,
    config
) {
    /**
     * Constants
     */
    const DELIVERY_TYPE_EMAIL = "1";
    const DELIVERY_TYPE_MAIL = "2";
    const DELIVERY_TYPE_PORTAL = "3";
    const DELIVERY_TYPE_TEXT_EMAIL = "Email";
    const DELIVERY_TYPE_TEXT_MAIL = "Mail";
    const DELIVERY_TYPE_TEXT_PORTAL = "Portal";

    function onRequest(context) {
        /**
         * Global Variables
         */
        var scg_invpdf_context = runtime.getCurrentScript();
        var compFeatures = config.load({
            type: config.Type.FEATURES
        });
        var groupEnabled = compFeatures.getValue("invoicegroup");
        log.debug("groupEnabled", groupEnabled);

        if (context.request.method === "GET") {
            try {
                var form = serverWidget.createForm({
                    title: "Invoice Bulk Processing"
                });

                form.clientScriptModulePath =
                    "SuiteScripts/scg_cs_process_invoices.js";

                //Check filter parameters
                var tranStartDate = context.request.parameters.transtartdate;
                var tranEndDate = context.request.parameters.tranenddate;
                var customer = context.request.parameters.customer;
                var subsidiary = context.request.parameters.subsidiary;
                var email = context.request.parameters.email;
                var location = context.request.parameters.location;
                if (email == null) {
                    email = "T";
                } else if (email == "true") {
                    email = "T";
                } else if (email == "false") {
                    email = "F";
                }
                var mail = context.request.parameters.mail;
                if (mail == null) {
                    mail = "T";
                } else if (mail == "true") {
                    mail = "T";
                } else if (mail == "false") {
                    mail = "F";
                }
                var portal = context.request.parameters.portal;
                if (portal == null) {
                    portal = "T";
                } else if (portal == "true") {
                    portal = "T";
                } else if (portal == "false") {
                    portal = "F";
                }
                var status = context.request.parameters.status;
                var failed = context.request.parameters.failed;
                if (failed == null) {
                    failed = "F";
                } else if (failed == "true") {
                    failed = "T";
                } else if (failed == "false") {
                    failed = "F";
                }
                var success = context.request.parameters.success;
                if (success == null) {
                    success = "F";
                } else if (success == "true") {
                    success = "T";
                } else if (success == "false") {
                    success = "F";
                }
                var refresh = context.request.parameters.refresh;

                //Form Fields
                fld = form.addField({
                    id: "custpage_tran_start_date",
                    type: "date",
                    label: "Earliest Tran Date"
                });
                fld.defaultValue = tranStartDate;

                fld = form.addField({
                    id: "custpage_tran_end_date",
                    type: "date",
                    label: "Latest Tran Date"
                });
                fld.defaultValue = tranEndDate;

                fld = form.addField({
                    id: "custpage_customer",
                    type: "select",
                    label: "Customer",
                    source: "customer"
                });
                fld.defaultValue = customer;

                fld = form.addField({
                    id: "custpage_subsidiary",
                    type: "select",
                    label: "Subsidiary",
                    source: "subsidiary"
                });
                fld.defaultValue = subsidiary;

                fld = form.addField({
                    id: "custpage_location",
                    type: "select",
                    label: "Location",
                    source: "location"
                });
                fld.defaultValue = location;

                fld.updateBreakType({
                    breakType: "startcol"
                });

                fld = form.addField({
                    id: "custpage_status",
                    type: "select",
                    label: "Status",
                    source: "status"
                });
                fld.addSelectOption({
                    value: "CustInvc:A",
                    text: "Open"
                });
                fld.addSelectOption({
                    value: "CustInvc:B",
                    text: "Paid In Full"
                });
                fld.addSelectOption({
                    value: "@ALL@",
                    text: "All"
                });
                fld.defaultValue = status;

                var fld = form.addField({
                    id: "custpage_success",
                    type: "checkbox",
                    label: "Include Previously Successful Transactions"
                });
                fld.defaultValue = success == "T" ? "T" : "F";

                var fld = form.addField({
                    id: "custpage_failed",
                    type: "checkbox",
                    label: "Include Previously Failed Transactions"
                });
                fld.defaultValue = failed == "T" ? "T" : "F";

                var fld = form.addField({
                    id: "custpage_email",
                    type: "checkbox",
                    label: "Email Invoice"
                });
                fld.defaultValue = email == "F" ? "F" : "T";
                fld.updateBreakType({
                    breakType: "startcol"
                });

                var fld = form.addField({
                    id: "custpage_mail",
                    type: "checkbox",
                    label: "Mail Invoice"
                });
                fld.defaultValue = mail == "F" ? "F" : "T";

                var fld = form.addField({
                    id: "custpage_portal",
                    type: "checkbox",
                    label: "Portal Submit"
                });
                fld.defaultValue = portal == "F" ? "F" : "T";

                var fld = form.addField({
                    id: "custpage_count",
                    type: "integer",
                    label: "Invoice Count"
                });
                fld.updateDisplayType({
                    displayType: "inline"
                });
                fld.defaultValue = 0;
                fld.updateBreakType({
                    breakType: "startcol"
                });

                var fld = form.addField({
                    id: "custpage_total",
                    type: "currency",
                    label: "Invoice Total"
                });
                fld.updateDisplayType({
                    displayType: "inline"
                });
                fld.defaultValue = 0;

                if (groupEnabled == true) {
                    var fld = form.addField({
                        id: "custpage_grouped_count",
                        type: "integer",
                        label: "Grouped Invoice Count"
                    });
                    fld.updateDisplayType({
                        displayType: "inline"
                    });
                    fld.defaultValue = 0;
                    fld.updateBreakType({
                        breakType: "startcol"
                    });

                    var fld = form.addField({
                        id: "custpage_grouped_total",
                        type: "currency",
                        label: "Grouped Invoice Total"
                    });
                    fld.updateDisplayType({
                        displayType: "inline"
                    });
                    fld.defaultValue = 0;
                }

                fld = form.addField({
                    id: "custpage_filter_changed",
                    type: "checkbox",
                    label: "Filter Changed"
                });
                fld.defaultValue = "F";
                fld.updateDisplayType({
                    displayType: "hidden"
                });

                fld = form.addField({
                    id: "custpage_url_params",
                    type: "text",
                    label: "URL Parameters"
                });
                fld.updateDisplayType({
                    displayType: "hidden"
                });

                // Invoice Sublist
                var invList = form.addSublist({
                    id: "custpage_inv_list",
                    type: "list",
                    label: "Invoices"
                });

                log.debug("context.request", context.request);
                log.debug(
                    "context.request.parameters",
                    context.request.parameters
                );
                invList.addButton({
                    id: "custpage_inv_refresh",
                    label: "Refresh",
                    functionName: "scg_invpdf_updateUrlParams"
                });
                invList.addField({
                    id: "custpage_inv_process",
                    type: "checkbox",
                    label: "Process"
                });
                fld = invList.addField({
                    id: "custpage_inv_item",
                    type: "select",
                    label: "Invoice",
                    source: "transaction"
                });
                fld.updateDisplayType({
                    displayType: "hidden"
                });
                invList.addField({
                    id: "custpage_inv_tranid",
                    type: "text",
                    label: "Invoice #"
                });
                invList.addField({
                    id: "custpage_inv_date",
                    type: "date",
                    label: "Tran Date"
                });
                fld = invList.addField({
                    id: "custpage_inv_customer",
                    type: "select",
                    label: "Customer",
                    source: "customer"
                });
                fld.updateDisplayType({
                    displayType: "inline"
                });
                fld = invList.addField({
                    id: "custpage_inv_subsidiary",
                    type: "select",
                    label: "Subsidiary",
                    source: "subsidiary"
                });
                fld.updateDisplayType({
                    displayType: "inline"
                });
                invList.addField({
                    id: "custpage_inv_delivery_method",
                    type: "text",
                    label: "Delivery Method"
                });
                invList.addField({
                    id: "custpage_inv_amount",
                    type: "currency",
                    label: "Amount"
                });
                invList.addField({
                    id: "custpage_inv_status",
                    type: "text",
                    label: "Status"
                });
                invList.addField({
                    id: "custpage_inv_delivery_date",
                    type: "text",
                    label: "Date Processed"
                });
                invList.addField({
                    id: "custpage_inv_error",
                    type: "text",
                    label: "Error"
                });
                invList.addMarkAllButtons();

                if (groupEnabled == true) {
                    var groupedInvList = form.addSublist({
                        id: "custpage_grouped_inv_list",
                        type: "list",
                        label: "Grouped Invoices"
                    });

                    groupedInvList.addButton({
                        id: "custpage_inv_refresh",
                        label: "Refresh",
                        functionName: "scg_invpdf_updateUrlParams"
                    });
                    groupedInvList.addField({
                        id: "custpage_inv_process",
                        type: "checkbox",
                        label: "Process"
                    });
                    fld = groupedInvList.addField({
                        id: "custpage_inv_item",
                        type: "select",
                        label: "Invoice",
                        source: "transaction"
                    });
                    fld.updateDisplayType({
                        displayType: "hidden"
                    });
                    groupedInvList.addField({
                        id: "custpage_inv_tranid",
                        type: "text",
                        label: "Invoice #"
                    });
                    groupedInvList.addField({
                        id: "custpage_inv_date",
                        type: "date",
                        label: "Tran Date"
                    });
                    fld = groupedInvList.addField({
                        id: "custpage_inv_customer",
                        type: "select",
                        label: "Customer",
                        source: "customer"
                    });
                    fld.updateDisplayType({
                        displayType: "inline"
                    });
                    fld = groupedInvList.addField({
                        id: "custpage_inv_subsidiary",
                        type: "select",
                        label: "Subsidiary",
                        source: "subsidiary"
                    });
                    fld.updateDisplayType({
                        displayType: "inline"
                    });
                    groupedInvList.addField({
                        id: "custpage_inv_delivery_method",
                        type: "text",
                        label: "Delivery Method"
                    });
                    groupedInvList.addField({
                        id: "custpage_inv_amount",
                        type: "currency",
                        label: "Amount"
                    });
                    groupedInvList.addField({
                        id: "custpage_inv_status",
                        type: "text",
                        label: "Status"
                    });
                    // groupedInvList.addField({
                    //     id: 'custpage_inv_variable_rev',
                    //     type: 'text',
                    //     label: 'Var Rev Comp Incl'
                    // });
                    groupedInvList.addField({
                        id: "custpage_inv_delivery_date",
                        type: "text",
                        label: "Date Processed"
                    });
                    groupedInvList.addField({
                        id: "custpage_inv_error",
                        type: "text",
                        label: "Error"
                    });
                    groupedInvList.addMarkAllButtons();
                }
                // Search for Invoices
                var invData = [];
                var invCount = 0;
                var invTotal = 0;
                var minInternalId = 0;
                var resultCount = 0;
                do {
                    log.debug("email", email);
                    log.debug("mail", mail);
                    log.debug("portal", portal);
                    var results = scg_invpdf_getInvoices(
                        customer,
                        subsidiary,
                        status,
                        tranStartDate,
                        tranEndDate,
                        failed,
                        success,
                        email,
                        mail,
                        portal,
                        minInternalId,
                        groupEnabled,
                        location
                    );
                    resultCount = results ? results.length : 0;
                    log.debug("result count: ", resultCount);
                    for (var x = 0; results && x < results.length; x++) {
                        invData[invCount] = [];
                        invData[invCount]["custpage_inv_process"] = false;
                        invData[invCount]["custpage_inv_item"] = results[x].id;
                        invData[invCount]["custpage_inv_tranid"] =
                            '<a href="' +
                            url.resolveRecord({
                                recordType: "invoice",
                                recordId: results[x].id,
                                isEditMode: false
                            }) +
                            '">' +
                            results[x].getValue("tranid") +
                            "</a>";
                        invData[invCount]["custpage_inv_date"] =
                            results[x].getValue("trandate");
                        invData[invCount]["custpage_inv_customer"] =
                            results[x].getValue("entity");
                        invData[invCount]["custpage_inv_subsidiary"] = results[
                            x
                        ].getValue("subsidiarynohierarchy");
                        var deliveryMethod =
                            results[x]
                                .getValue("custbody_invoice_delivery_type")
                                .split(",")
                                .indexOf(DELIVERY_TYPE_EMAIL) >= 0
                                ? "Email"
                                : "";
                        deliveryMethod += deliveryMethod
                            ? results[x]
                                  .getValue("custbody_invoice_delivery_type")
                                  .split(",")
                                  .indexOf(DELIVERY_TYPE_MAIL) >= 0
                                ? ", Mail"
                                : ""
                            : results[x]
                                  .getValue("custbody_invoice_delivery_type")
                                  .split(",")
                                  .indexOf(DELIVERY_TYPE_MAIL) >= 0
                            ? "Mail"
                            : "";
                        deliveryMethod += deliveryMethod
                            ? results[x]
                                  .getValue("custbody_invoice_delivery_type")
                                  .split(",")
                                  .indexOf(DELIVERY_TYPE_PORTAL) >= 0
                                ? ", Portal"
                                : ""
                            : results[x]
                                  .getValue("custbody_invoice_delivery_type")
                                  .split(",")
                                  .indexOf(DELIVERY_TYPE_PORTAL) >= 0
                            ? "Portal"
                            : "";
                        invData[invCount]["custpage_inv_delivery_method"] =
                            deliveryMethod;
                        invData[invCount]["custpage_inv_amount"] =
                            results[x].getValue("total");
                        // invData[invCount]['custpage_inv_variable_rev'] = ((results[x].getValue('custbody_scg_var_rev_included') == true) ? 'Yes' : 'No');
                        invData[invCount]["custpage_inv_status"] =
                            results[x].getText("status");
                        invData[invCount]["custpage_inv_delivery_date"] =
                            results[x].getValue(
                                "custbody_invoice_delivery_date"
                            )
                                ? results[x]
                                      .getValue(
                                          "custbody_invoice_delivery_date"
                                      )
                                      .substring(0, 19)
                                : "";
                        invData[invCount]["custpage_inv_error"] = results[
                            x
                        ].getValue("custbody_invoice_delivery_error")
                            ? results[x]
                                  .getValue("custbody_invoice_delivery_error")
                                  .substring(0, 19)
                            : "";
                        invCount++;
                        invTotal += parseFloat(results[x].getValue("total"));
                        minInternalId = results[x].getValue("internalid");
                    }
                } while (resultCount > 0 && invCount < 3500);

                for (var i = 0; i < invCount; i++) {
                    if (!isEmpty(invData[i]["custpage_inv_process"])) {
                        invList.setSublistValue({
                            id: "custpage_inv_process",
                            line: i,
                            value: invData[i]["custpage_inv_process"]
                        });
                    }
                    if (!isEmpty(invData[i]["custpage_inv_item"])) {
                        invList.setSublistValue({
                            id: "custpage_inv_item",
                            line: i,
                            value: invData[i]["custpage_inv_item"]
                        });
                    }
                    if (!isEmpty(invData[i]["custpage_inv_tranid"])) {
                        invList.setSublistValue({
                            id: "custpage_inv_tranid",
                            line: i,
                            value: invData[i]["custpage_inv_tranid"]
                        });
                    }
                    if (!isEmpty(invData[i]["custpage_inv_date"])) {
                        invList.setSublistValue({
                            id: "custpage_inv_date",
                            line: i,
                            value: invData[i]["custpage_inv_date"]
                        });
                    }
                    if (!isEmpty(invData[i]["custpage_inv_customer"])) {
                        invList.setSublistValue({
                            id: "custpage_inv_customer",
                            line: i,
                            value: invData[i]["custpage_inv_customer"]
                        });
                    }
                    if (!isEmpty(invData[i]["custpage_inv_subsidiary"])) {
                        invList.setSublistValue({
                            id: "custpage_inv_subsidiary",
                            line: i,
                            value: invData[i]["custpage_inv_subsidiary"]
                        });
                    }
                    if (!isEmpty(invData[i]["custpage_inv_delivery_method"])) {
                        invList.setSublistValue({
                            id: "custpage_inv_delivery_method",
                            line: i,
                            value: invData[i]["custpage_inv_delivery_method"]
                        });
                    }
                    if (!isEmpty(invData[i]["custpage_inv_amount"])) {
                        invList.setSublistValue({
                            id: "custpage_inv_amount",
                            line: i,
                            value: invData[i]["custpage_inv_amount"]
                        });
                    }
                    if (!isEmpty(invData[i]["custpage_inv_variable_rev"])) {
                        invList.setSublistValue({
                            id: "custpage_inv_variable_rev",
                            line: i,
                            value: invData[i]["custpage_inv_variable_rev"]
                        });
                    }
                    if (!isEmpty(invData[i]["custpage_inv_status"])) {
                        invList.setSublistValue({
                            id: "custpage_inv_status",
                            line: i,
                            value: invData[i]["custpage_inv_status"]
                        });
                    }
                    if (!isEmpty(invData[i]["custpage_inv_delivery_date"])) {
                        invList.setSublistValue({
                            id: "custpage_inv_delivery_date",
                            line: i,
                            value: invData[i]["custpage_inv_delivery_date"]
                        });
                    }
                    if (!isEmpty(invData[i]["custpage_inv_error"])) {
                        invList.setSublistValue({
                            id: "custpage_inv_error",
                            line: i,
                            value: invData[i]["custpage_inv_error"]
                        });
                    }
                }

                fld = form.getField("custpage_count");
                fld.defaultValue = invCount;
                fld = form.getField("custpage_total");
                fld.defaultValue = invTotal;

                // Search for Grouped Invoices
                if (groupEnabled == true) {
                    var invData = [];
                    var invCount = 0;
                    var invTotal = 0;
                    var minInternalId = 0;
                    var resultCount = 0;
                    do {
                        var results = scg_invpdf_getGroupedInvoices(
                            customer,
                            subsidiary,
                            status,
                            tranStartDate,
                            tranEndDate,
                            failed,
                            success,
                            email,
                            mail,
                            portal,
                            minInternalId
                        );
                        resultCount = results ? results.length : 0;
                        log.debug("result count: ", resultCount);
                        for (var x = 0; results && x < results.length; x++) {
                            invData[invCount] = [];
                            invData[invCount]["custpage_inv_process"] = false;
                            invData[invCount]["custpage_inv_item"] =
                                results[x].id;
                            invData[invCount]["custpage_inv_tranid"] =
                                '<a href="' +
                                url.resolveRecord({
                                    recordType: "invoicegroup",
                                    recordId: results[x].id,
                                    isEditMode: false
                                }) +
                                '">' +
                                results[x].getValue("invoicegroupnumber") +
                                "</a>";
                            invData[invCount]["custpage_inv_date"] =
                                results[x].getValue("trandate");
                            invData[invCount]["custpage_inv_customer"] =
                                results[x].getValue("customer");
                            invData[invCount]["custpage_inv_subsidiary"] =
                                results[x].getValue("subsidiary");
                            var deliveryMethod =
                                results[x]
                                    .getValue(
                                        "custrecord_invoice_delivery_type"
                                    )
                                    .split(",")
                                    .indexOf(DELIVERY_TYPE_EMAIL) >= 0
                                    ? "Email"
                                    : "";
                            deliveryMethod += deliveryMethod
                                ? results[x]
                                      .getValue(
                                          "custrecord_invoice_delivery_type"
                                      )
                                      .split(",")
                                      .indexOf(DELIVERY_TYPE_MAIL) >= 0
                                    ? ", Mail"
                                    : ""
                                : results[x]
                                      .getValue(
                                          "custrecord_invoice_delivery_type"
                                      )
                                      .split(",")
                                      .indexOf(DELIVERY_TYPE_MAIL) >= 0
                                ? "Mail"
                                : "";
                            deliveryMethod += deliveryMethod
                                ? results[x]
                                      .getValue(
                                          "custrecord_invoice_delivery_type"
                                      )
                                      .split(",")
                                      .indexOf(DELIVERY_TYPE_PORTAL) >= 0
                                    ? ", Portal"
                                    : ""
                                : results[x]
                                      .getValue(
                                          "custrecord_invoice_delivery_type"
                                      )
                                      .split(",")
                                      .indexOf(DELIVERY_TYPE_PORTAL) >= 0
                                ? "Portal"
                                : "";
                            invData[invCount]["custpage_inv_delivery_method"] =
                                deliveryMethod;
                            invData[invCount]["custpage_inv_amount"] =
                                results[x].getValue("itemtotal");
                            // invData[invCount]['custpage_inv_variable_rev'] = ((results[x].getValue('custbody_scg_var_rev_included') == true) ? 'Yes' : 'No');
                            invData[invCount]["custpage_inv_status"] =
                                results[x].getValue("invoicegroupstatus");
                            invData[invCount]["custpage_inv_delivery_date"] =
                                results[x].getValue(
                                    "custrecord_invoice_delivery_date"
                                )
                                    ? results[x]
                                          .getValue(
                                              "custrecord_invoice_delivery_date"
                                          )
                                          .substring(0, 19)
                                    : "";
                            invData[invCount]["custpage_inv_error"] = results[
                                x
                            ].getValue("custrecord_invoice_delivery_error")
                                ? results[x]
                                      .getValue(
                                          "custrecord_invoice_delivery_error"
                                      )
                                      .substring(0, 19)
                                : "";
                            invCount++;
                            invTotal += parseFloat(
                                results[x].getValue("itemtotal")
                            );
                            minInternalId = results[x].getValue("internalid");
                        }
                    } while (resultCount > 0);
                    for (var i = 0; i < invCount; i++) {
                        if (!isEmpty(invData[i]["custpage_inv_process"])) {
                            groupedInvList.setSublistValue({
                                id: "custpage_inv_process",
                                line: i,
                                value: invData[i]["custpage_inv_process"]
                            });
                        }
                        if (!isEmpty(invData[i]["custpage_inv_item"])) {
                            groupedInvList.setSublistValue({
                                id: "custpage_inv_item",
                                line: i,
                                value: invData[i]["custpage_inv_item"]
                            });
                        }
                        if (!isEmpty(invData[i]["custpage_inv_tranid"])) {
                            groupedInvList.setSublistValue({
                                id: "custpage_inv_tranid",
                                line: i,
                                value: invData[i]["custpage_inv_tranid"]
                            });
                        }
                        if (!isEmpty(invData[i]["custpage_inv_date"])) {
                            groupedInvList.setSublistValue({
                                id: "custpage_inv_date",
                                line: i,
                                value: invData[i]["custpage_inv_date"]
                            });
                        }
                        if (!isEmpty(invData[i]["custpage_inv_customer"])) {
                            groupedInvList.setSublistValue({
                                id: "custpage_inv_customer",
                                line: i,
                                value: invData[i]["custpage_inv_customer"]
                            });
                        }
                        if (!isEmpty(invData[i]["custpage_inv_subsidiary"])) {
                            groupedInvList.setSublistValue({
                                id: "custpage_inv_subsidiary",
                                line: i,
                                value: invData[i]["custpage_inv_subsidiary"]
                            });
                        }
                        if (
                            !isEmpty(invData[i]["custpage_inv_delivery_method"])
                        ) {
                            groupedInvList.setSublistValue({
                                id: "custpage_inv_delivery_method",
                                line: i,
                                value: invData[i][
                                    "custpage_inv_delivery_method"
                                ]
                            });
                        }
                        if (!isEmpty(invData[i]["custpage_inv_amount"])) {
                            groupedInvList.setSublistValue({
                                id: "custpage_inv_amount",
                                line: i,
                                value: invData[i]["custpage_inv_amount"]
                            });
                        }
                        // if (!isEmpty(invData[i]['custpage_inv_variable_rev'])) {
                        //     groupedInvList.setSublistValue({
                        //         id: 'custpage_inv_variable_rev',
                        //         line: i,
                        //         value: invData[i]['custpage_inv_variable_rev']
                        //     });
                        // }
                        if (!isEmpty(invData[i]["custpage_inv_status"])) {
                            groupedInvList.setSublistValue({
                                id: "custpage_inv_status",
                                line: i,
                                value: invData[i]["custpage_inv_status"]
                            });
                        }
                        if (
                            !isEmpty(invData[i]["custpage_inv_delivery_date"])
                        ) {
                            groupedInvList.setSublistValue({
                                id: "custpage_inv_delivery_date",
                                line: i,
                                value: invData[i]["custpage_inv_delivery_date"]
                            });
                        }
                        if (!isEmpty(invData[i]["custpage_inv_error"])) {
                            groupedInvList.setSublistValue({
                                id: "custpage_inv_error",
                                line: i,
                                value: invData[i]["custpage_inv_error"]
                            });
                        }
                    }
                    fld = form.getField("custpage_grouped_count");
                    fld.defaultValue = invCount;
                    fld = form.getField("custpage_grouped_total");
                    fld.defaultValue = invTotal;
                }

                form.addSubmitButton("Process Invoices");

                context.response.writePage(form);
            } catch (e) {
                scg_invpdf_logError(e);
                throw e;
            }
        } else {
            try {
                // Get Invoice internal IDs and kick off scheduled script to process selected Invoices
                log.debug("IN POST");
                var invIds = [];
                var itemCount =
                    context.request.getLineCount("custpage_inv_list");
                log.debug("itemCount", itemCount);
                for (var i = 0; itemCount != 0 && i < itemCount; i++) {
                    if (
                        context.request.getSublistValue({
                            group: "custpage_inv_list",
                            name: "custpage_inv_process",
                            line: i
                        }) == "T"
                    ) {
                        invIds.push(
                            context.request.getSublistValue({
                                group: "custpage_inv_list",
                                name: "custpage_inv_item",
                                line: i
                            })
                        );
                    }
                }
                log.debug("invIds", invIds);

                var groupedInvIds = [];
                if (groupEnabled == true) {
                    var groupedItemCount = context.request.getLineCount(
                        "custpage_grouped_inv_list"
                    );
                    log.debug("groupedItemCount", groupedItemCount);
                    for (
                        var i = 0;
                        groupedItemCount != 0 && i < groupedItemCount;
                        i++
                    ) {
                        if (
                            context.request.getSublistValue({
                                group: "custpage_grouped_inv_list",
                                name: "custpage_inv_process",
                                line: i
                            }) == "T"
                        ) {
                            groupedInvIds.push(
                                context.request.getSublistValue({
                                    group: "custpage_grouped_inv_list",
                                    name: "custpage_inv_item",
                                    line: i
                                })
                            );
                        }
                    }
                    log.debug("groupedInvIds", groupedInvIds);
                }

                // Start the scheduled script that will process the Invoices submitted by the user
                if (invIds || groupedInvIds) {
                    if (!isEmpty(invIds)) {
                        var scriptSched = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: "customscript_scg_mr_process_invoices",
                            params: {
                                custscript_scg_mr_process_inv_ids:
                                    JSON.stringify(invIds)
                            }
                        });
                        log.debug("Deployment Scheduled: ", scriptSched);

                        scriptSched.submit();

                        redirect.toTaskLink({
                            id: "LIST_MAPREDUCESCRIPTSTATUS",
                            parameters: {
                                scripttype: scg_invpdf_getScriptInternalId(
                                    "customscript_scg_mr_process_invoices"
                                )
                            }
                        });
                    }
                    if (!isEmpty(groupedInvIds) && groupEnabled) {
                        var scriptSched = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: "customscript_scg_mr_process_gr_invoices",
                            deploymentId:
                                "customdeploy_scg_mr_process_gr_invoices",
                            params: {
                                custscript_scg_mr_process_gr_inv_ids:
                                    JSON.stringify(groupedInvIds)
                            }
                        });
                        log.debug("Deployment Scheduled: ", scriptSched);

                        scriptSched.submit();

                        redirect.toTaskLink({
                            id: "LIST_MAPREDUCESCRIPTSTATUS",
                            parameters: {
                                scripttype: scg_invpdf_getScriptInternalId(
                                    "customscript_scg_mr_process_gr_invoices"
                                )
                            }
                        });
                    }
                } else {
                    var errorMessage = error.create({
                        name: "INVOICE_EMAIL-NO_INV_SELECTED",
                        message:
                            "There were no Invoices selected. Please go back and select at least one Invoice."
                    });
                    throw errorMessage;
                }
            } catch (e) {
                scg_invpdf_logError(e);
                throw e;
            }
        }
    }

    /**
     * Logs an exception to the script execution log
     *
     * @appliedtorecord invoice
     *
     * @param {String} e Exception
     * @returns {Void}
     */
    function scg_invpdf_logError(e) {
        // Log the error based on available details
        var errorMessage = error.create({
            name: e.name,
            message: e.message
        });
        log.error("System Error", JSON.stringify(errorMessage));
    }

    /**
     * Returns the internal id of the given script
     *
     * @appliedtorecord script
     *
     * @param {Array} scriptId: identifier given to this script
     * @returns {Integer}
     */
    function scg_invpdf_getScriptInternalId(scriptId) {
        // Initialize variables
        var scriptInternalId = "";

        // Define filters
        var filters = search.createFilter({
            name: "scriptid",
            operator: search.Operator.IS,
            values: scriptId
        });

        // Define columns
        var columns = search.createColumn("internalid");

        // Get results
        var mySearch = search.create({
            type: "script",
            columns: columns,
            filters: filters
        });
        log.debug("scg_invpdf_getScriptInternalId: mySearch", mySearch);

        var results = mySearch.run();
        log.debug("scg_invpdf_getScriptInternalId: search results", results);

        if (results && results.length > 0) {
            scriptInternalId = results[0].id;
        }
        log.debug(
            "scg_invpdf_getScriptInternalId: scriptInternalId",
            scriptInternalId
        );

        // Return
        return scriptInternalId;
    }

    /**
     * Search for Invoices
     *
     * @appliedtorecord invoice
     *
     * @param {Integer} customer: internal id of a Customer record
     * @param {String} tranStartDate: earliest transaction date
     * @param {String} tranEndDate: latest transaction date
     * @param {String} failed: include transactions with a previous failed processing attempt
     * @param {String} success: include transactions with a previous successful processing attempt
     * @param {String} email: include transactions to be delivered by email
     * @param {String} mail: include transactions to be delivered by mail
     * @param {Integer} minInternalId: minimum transaction internal id of the next page of results
     * @returns {nlobjSearchResults}
     */
    function scg_invpdf_getInvoices(
        customer,
        subsidiary,
        status,
        tranStartDate,
        tranEndDate,
        failed,
        success,
        email,
        mail,
        portal,
        minInternalId,
        groupEnabled,
        location
    ) {
        //function scg_invpdf_getInvoices(customer, subsidiary, status, tranStartDate, tranEndDate, failed, success, email, portal, minInternalId) {
        // Build formula for Delivery Method filter
        var deliveryMethodFormula = "CASE WHEN ";
        if (email == "T") {
            deliveryMethodFormula +=
                "INSTR({custbody_invoice_delivery_type}, '" +
                DELIVERY_TYPE_TEXT_EMAIL +
                "') > 0";
            if (mail == "T") {
                deliveryMethodFormula +=
                    " OR INSTR({custbody_invoice_delivery_type}, '" +
                    DELIVERY_TYPE_TEXT_MAIL +
                    "') > 0";
            }
            if (portal == "T") {
                deliveryMethodFormula +=
                    " OR INSTR({custbody_invoice_delivery_type}, '" +
                    DELIVERY_TYPE_TEXT_PORTAL +
                    "') > 0";
            }
        } else if (mail == "T") {
            deliveryMethodFormula +=
                "INSTR({custbody_invoice_delivery_type}, '" +
                DELIVERY_TYPE_TEXT_MAIL +
                "') > 0";
            if (portal == "T") {
                deliveryMethodFormula +=
                    " OR INSTR({custbody_invoice_delivery_type}, '" +
                    DELIVERY_TYPE_TEXT_PORTAL +
                    "') > 0";
            }
        } else if (portal == "T") {
            deliveryMethodFormula +=
                "INSTR({custbody_invoice_delivery_type}, '" +
                DELIVERY_TYPE_TEXT_PORTAL +
                "') > 0";
        } else {
            deliveryMethodFormula +=
                "INSTR({custbody_invoice_delivery_type}, '" +
                DELIVERY_TYPE_TEXT_EMAIL +
                "') = 0 AND INSTR({custbody_invoice_delivery_type}, '" +
                DELIVERY_TYPE_TEXT_MAIL +
                "') = 0 AND INSTR({custbody_invoice_delivery_type}, '" +
                DELIVERY_TYPE_TEXT_PORTAL +
                "') = 0";
        }
        deliveryMethodFormula += " THEN 1 ELSE 0 END";

        log.debug("deliveryMethodFormula", deliveryMethodFormula);
        log.debug(
            "failed formula",
            "CASE WHEN {custbody_invoice_delivery_error} IS NULL THEN 1 ELSE " +
                (failed == "T" ? "1" : "0") +
                " END"
        );
        log.debug(
            "success formula",
            "CASE WHEN {custbody_invoice_delivery_date} IS NULL THEN 1 ELSE " +
                (success == "T" ? "1" : "0") +
                " END"
        );

        // Define filters
        var filters = [];
        if (!isEmpty(customer)) {
            filters.push(
                search.createFilter("entity", null, "anyof", customer)
            );
        }
        if (!isEmpty(subsidiary)) {
            filters.push(
                search.createFilter("subsidiary", null, "anyof", subsidiary)
            );
        }
        if (!isEmpty(location)) {
            filters.push(
                search.createFilter("location", null, "anyof", location)
            );
        }
        filters.push(search.createFilter("mainline", null, "is", true));
        filters.push(
            search.createFilter(
                "status",
                null,
                "is",
                status ? status : "CustInvc:A"
            )
        ); //CustInvc:A = internal code for Open
        if (!isEmpty(tranStartDate)) {
            filters.push(
                search.createFilter(
                    "trandate",
                    null,
                    "onorafter",
                    tranStartDate
                )
            );
        }
        if (!isEmpty(tranEndDate)) {
            filters.push(
                search.createFilter("trandate", null, "onorbefore", tranEndDate)
            );
        }
        filters.push(
            search.createFilter({
                name: "formulanumeric",
                operator: "equalto",
                values: 1,
                formula:
                    "CASE WHEN {custbody_invoice_delivery_error} IS NULL THEN 1 ELSE " +
                    (failed == "T" ? "1" : "0") +
                    " END"
            })
        );
        filters.push(
            search.createFilter({
                name: "formulanumeric",
                operator: "equalto",
                values: 1,
                formula:
                    "CASE WHEN {custbody_invoice_delivery_date} IS NULL THEN 1 ELSE " +
                    (success == "T" ? "1" : "0") +
                    " END"
            })
        );
        filters.push(
            search.createFilter({
                name: "formulanumeric",
                operator: "equalto",
                values: 1,
                formula: deliveryMethodFormula
            })
        );
        filters.push(
            search.createFilter(
                "internalidnumber",
                null,
                "greaterthan",
                minInternalId
            )
        );
        // filter out any invoices with a legacy number
        filters.push(
            search.createFilter({
                name: "custbody_scg_legacy_inv",
                operator: search.Operator.ISEMPTY
            })
        );
        if (groupEnabled == true) {
            filters.push(
                search.createFilter("forinvoicegrouping", null, "is", false)
            );
        }

        // Define columns
        var columns = [];
        columns.push(
            search.createColumn({
                name: "internalid",
                sort: search.Sort.ASC
            })
        );
        columns.push(search.createColumn("tranid"));
        columns.push(search.createColumn("trandate"));
        columns.push(search.createColumn("entity"));
        columns.push(search.createColumn("subsidiarynohierarchy"));
        columns.push(search.createColumn("custbody_invoice_delivery_date"));
        // columns.push(search.createColumn('custbody_scg_var_rev_included'));
        columns.push(search.createColumn("status"));
        columns.push(search.createColumn("custbody_invoice_delivery_error"));
        columns.push(search.createColumn("custbody_invoice_delivery_type"));
        columns.push(search.createColumn("total"));

        // Return results
        var mySearch = search.create({
            type: "invoice",
            id: "customsearch_invoice_search",
            columns: columns,
            filters: filters
        });
        log.debug("mySearch", mySearch);

        var myResults = mySearch.run().getRange(0, 1000);
        log.debug("myResults", myResults);

        return myResults;
    }

    /**
     * Search for Grouped Invoices
     *
     * @appliedtorecord invoice
     *
     * @param {Integer} customer: internal id of a Customer record
     * @param {String} tranStartDate: earliest transaction date
     * @param {String} tranEndDate: latest transaction date
     * @param {String} failed: include transactions with a previous failed processing attempt
     * @param {String} success: include transactions with a previous successful processing attempt
     * @param {String} email: include transactions to be delivered by email
     * @param {String} mail: include transactions to be delivered by mail
     * @param {Integer} minInternalId: minimum transaction internal id of the next page of results
     * @returns {nlobjSearchResults}
     */
    function scg_invpdf_getGroupedInvoices(
        customer,
        subsidiary,
        status,
        tranStartDate,
        tranEndDate,
        failed,
        success,
        email,
        mail,
        portal,
        minInternalId
    ) {
        //function scg_invpdf_getInvoices(customer, subsidiary, status, tranStartDate, tranEndDate, failed, success, email, portal, minInternalId) {
        // Build formula for Delivery Method filter
        var deliveryMethodFormula = "CASE WHEN ";
        if (email == "T") {
            deliveryMethodFormula +=
                "INSTR({custrecord_invoice_delivery_type}, '" +
                DELIVERY_TYPE_TEXT_EMAIL +
                "') > 0";
            if (mail == "T") {
                deliveryMethodFormula +=
                    " OR INSTR({custrecord_invoice_delivery_type}, '" +
                    DELIVERY_TYPE_TEXT_MAIL +
                    "') > 0";
            }
            if (portal == "T") {
                deliveryMethodFormula +=
                    " OR INSTR({custrecord_invoice_delivery_type}, '" +
                    DELIVERY_TYPE_TEXT_PORTAL +
                    "') > 0";
            }
        } else if (mail == "T") {
            deliveryMethodFormula +=
                "INSTR({custrecord_invoice_delivery_type}, '" +
                DELIVERY_TYPE_TEXT_MAIL +
                "') > 0";
            if (portal == "T") {
                deliveryMethodFormula +=
                    " OR INSTR({custrecord_invoice_delivery_type}, '" +
                    DELIVERY_TYPE_TEXT_PORTAL +
                    "') > 0";
            }
        } else if (portal == "T") {
            deliveryMethodFormula +=
                "INSTR({custrecord_invoice_delivery_type}, '" +
                DELIVERY_TYPE_TEXT_PORTAL +
                "') > 0";
        } else {
            deliveryMethodFormula +=
                "INSTR({custrecord_invoice_delivery_type}, '" +
                DELIVERY_TYPE_TEXT_EMAIL +
                "') = 0 AND INSTR({custrecord_invoice_delivery_type}, '" +
                DELIVERY_TYPE_TEXT_MAIL +
                "') = 0 AND INSTR({custrecord_invoice_delivery_type}, '" +
                DELIVERY_TYPE_TEXT_PORTAL +
                "') = 0";
        }
        deliveryMethodFormula += " THEN 1 ELSE 0 END";

        log.debug("deliveryMethodFormula", deliveryMethodFormula);
        log.debug(
            "failed formula",
            "CASE WHEN {custrecord_invoice_delivery_error} IS NULL THEN 1 ELSE " +
                (failed == "T" ? "1" : "0") +
                " END"
        );
        log.debug(
            "success formula",
            "CASE WHEN {custrecord_invoice_delivery_date} IS NULL THEN 1 ELSE " +
                (success == "T" ? "1" : "0") +
                " END"
        );

        // Define filters
        var filters = [];
        if (!isEmpty(customer)) {
            filters.push(
                search.createFilter("customer", null, "anyof", customer)
            );
        }
        if (!isEmpty(subsidiary)) {
            filters.push(
                search.createFilter("subsidiary", null, "anyof", subsidiary)
            );
        }
        // filters.push(search.createFilter('mainline', null, 'is', true));
        log.debug("grouped inv status", status);
        if (status == "CustInvc:A") {
            status = "OPEN";
        } else if (status == "CustInvc:B") {
            status = "PAIDFULL";
        }
        filters.push(
            search.createFilter(
                "invoicegroupstatus",
                null,
                "is",
                status ? status : "OPEN"
            )
        ); //CustInvc:A = internal code for Open
        if (!isEmpty(tranStartDate)) {
            filters.push(
                search.createFilter(
                    "trandate",
                    null,
                    "onorafter",
                    tranStartDate
                )
            );
        }
        if (!isEmpty(tranEndDate)) {
            filters.push(
                search.createFilter("trandate", null, "onorbefore", tranEndDate)
            );
        }
        filters.push(
            search.createFilter({
                name: "formulanumeric",
                operator: "equalto",
                values: 1,
                formula:
                    "CASE WHEN {custrecord_invoice_delivery_error} IS NULL THEN 1 ELSE " +
                    (failed == "T" ? "1" : "0") +
                    " END"
            })
        );
        filters.push(
            search.createFilter({
                name: "formulanumeric",
                operator: "equalto",
                values: 1,
                formula:
                    "CASE WHEN {custrecord_invoice_delivery_date} IS NULL THEN 1 ELSE " +
                    (success == "T" ? "1" : "0") +
                    " END"
            })
        );
        filters.push(
            search.createFilter({
                name: "formulanumeric",
                operator: "equalto",
                values: 1,
                formula: deliveryMethodFormula
            })
        );
        filters.push(
            search.createFilter(
                "internalidnumber",
                null,
                "greaterthan",
                minInternalId
            )
        );
        // filters.push(search.createFilter('forinvoicegrouping', null, 'is', true));

        // Define columns
        var columns = [];
        columns.push(
            search.createColumn({
                name: "internalid",
                sort: search.Sort.ASC
            })
        );
        columns.push(search.createColumn("invoicegroupnumber"));
        columns.push(search.createColumn("trandate"));
        columns.push(search.createColumn("customer"));
        columns.push(search.createColumn("subsidiary"));
        columns.push(search.createColumn("custrecord_invoice_delivery_date"));
        // columns.push(search.createColumn('custbody_scg_var_rev_included'));
        columns.push(search.createColumn("invoicegroupstatus"));
        columns.push(search.createColumn("custrecord_invoice_delivery_error"));
        columns.push(search.createColumn("custrecord_invoice_delivery_type"));
        columns.push(search.createColumn("itemtotal"));

        // Return results
        var mySearch = search.create({
            type: "invoicegroup",
            columns: columns,
            filters: filters
        });
        log.debug("mySearch", mySearch);

        var myResults = mySearch.run().getRange(0, 1000);
        log.debug("myResults", myResults);

        return myResults;
    }

    function isEmpty(value) {
        if (
            value === "" ||
            value === null ||
            value === undefined ||
            value === false
        ) {
            return true;
        }
        return false;
    }

    return {
        onRequest: onRequest
    };
});
