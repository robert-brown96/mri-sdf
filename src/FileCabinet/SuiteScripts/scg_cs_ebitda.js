/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/query", "N/currentRecord", "N/ui/dialog", "N/search"], (
    query,
    currentRecord,
    dialog,
    search
) => {
    const SEA_ID = 1347;
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    const pageInit = async scriptContext => {
        let sea = await search.load.promise({
            id: SEA_ID
        });
        const rec = scriptContext.currentRecord;
        const postDateParam = rec.getValue("custpage_scg_post_date");
        const periodParam = rec.getValue("custpage_scg_period");
        const subParam = rec.getValue("custpage_scg_subsidiary");
        const includeChildrenParam = rec.getValue(
            "custpage_scg_includechildren"
        );
        const periodFieldsProm = getPeriodInfo(periodParam);
        const existingEntriesProm = getExistingEntries(
            periodParam,
            subParam,
            includeChildrenParam
        );
        let subProm = await new Promise(async (resolve, reject) => {
            if (!includeChildrenParam) {
                resolve([subParam]);
            } else {
                let a = await getChildSubs(subParam);
                let subIds = a.map(x => x.id);
                resolve([subParam, ...subIds]);
            }
        });
        console.log("subs: " + subProm);
        sea.filters.push(
            search.createFilter({
                name: "subsidiary",
                operator: search.Operator.ANYOF,
                values: subProm
            })
        );
        const totalLinesProm = sea.run().getRange.promise(0, 1000);
        sea.filters.push(
            search.createFilter({
                name: "postingperiod",
                operator: search.Operator.ANYOF,
                values: periodParam
            })
        );
        const toBeProcessedResultsProm = sea.run().getRange.promise(0, 1000);

        const [
            periodFields,
            totalLines,
            toBeProcessedResults,
            existingEntries
        ] = await Promise.all([
            periodFieldsProm,
            totalLinesProm,
            toBeProcessedResultsProm,
            existingEntriesProm
        ]);

        getPriorPeriodEntries(periodParam, subProm, periodFields.enddate).then(
            results => {
                rec.setValue({
                    fieldId: "custpage_scg_prior",
                    value: results.length
                });
            }
        );

        rec.setValue({
            fieldId: "custpage_scg_unprocessed",
            value: toBeProcessedResults.length
        });
        rec.setValue({
            fieldId: "custpage_scg_existing_entries",
            value: existingEntries.length
        });
        //    rec.setValue({
        //          fieldId: "custpage_scg_prior",
        //           value: totalLines.length - toBeProcessedResults.length
        //        });
        rec.setValue({
            fieldId: "custpage_scg_post_date",
            value: new Date(periodFields.enddate)
        });
    };

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    const fieldChanged = async scriptContext => {
        try {
            if (
                scriptContext.fieldId !== "custpage_scg_period" &&
                scriptContext.fieldId !== "custpage_scg_subsidiary"
            )
                return;

            let sea = await search.load.promise({
                id: SEA_ID
            });
            const rec = scriptContext.currentRecord;
            const postDateParam = rec.getValue("custpage_scg_post_date");
            const periodParam = rec.getValue("custpage_scg_period");
            const subParam = rec.getValue("custpage_scg_subsidiary");
            const includeChildrenParam = rec.getValue(
                "custpage_scg_includechildren"
            );
            const periodFieldsProm = getPeriodInfo(periodParam);
            const existingEntriesProm = getExistingEntries(
                periodParam,
                subParam,
                includeChildrenParam
            );
            let subProm = await new Promise(async (resolve, reject) => {
                if (!includeChildrenParam) {
                    resolve([subParam]);
                } else {
                    let a = await getChildSubs(subParam);
                    let subIds = a.map(x => x.id);
                    resolve([subParam, ...subIds]);
                }
            });
            console.log("subs: " + subProm);
            sea.filters.push(
                search.createFilter({
                    name: "subsidiary",
                    operator: search.Operator.ANYOF,
                    values: subProm
                })
            );
            const totalLinesProm = sea.run().getRange.promise(0, 1000);
            sea.filters.push(
                search.createFilter({
                    name: "postingperiod",
                    operator: search.Operator.ANYOF,
                    values: periodParam
                })
            );
            const toBeProcessedResultsProm = sea
                .run()
                .getRange.promise(0, 1000);

            const [
                periodFields,
                totalLines,
                toBeProcessedResults,
                existingEntries
            ] = await Promise.all([
                periodFieldsProm,
                totalLinesProm,
                toBeProcessedResultsProm,
                existingEntriesProm
            ]);

            getPriorPeriodEntries(
                periodParam,
                subProm,
                periodFields.enddate
            ).then(results => {
                rec.setValue({
                    fieldId: "custpage_scg_prior",
                    value: results.length
                });
            });

            rec.setValue({
                fieldId: "custpage_scg_unprocessed",
                value: toBeProcessedResults.length
            });
            rec.setValue({
                fieldId: "custpage_scg_existing_entries",
                value: existingEntries.length
            });
            //    rec.setValue({
            //          fieldId: "custpage_scg_prior",
            //           value: totalLines.length - toBeProcessedResults.length
            //        });
            rec.setValue({
                fieldId: "custpage_scg_post_date",
                value: new Date(periodFields.enddate)
            });
        } catch (e) {
            console.log(`ERROR IN FIELD CHANGE: ${e}`);
        }
    };

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    const validateField = async scriptContext => {
        try {
            console.log("VAL");
            const rec = scriptContext.currentRecord;
            const fieldId = scriptContext.fieldId;
            if (fieldId !== "custpage_scg_post_date") return true;
            const postDateParam = rec.getValue("custpage_scg_post_date");
            const periodParam = rec.getValue("custpage_scg_period");
            getPeriodInfo(periodParam).then(periodFields => {
                let startDate = new Date(periodFields.startdate);
                let endDate = new Date(periodFields.enddate);
                let postDate = new Date(postDateParam);
                if (postDate > endDate || postDate < startDate) {
                    alert(
                        `You must enter a date within the selected    period`
                    );
                    rec.setValue({
                        fieldId: "custpage_scg_post_date",
                        value: endDate
                    });
                    return false;
                }
                return true;
            });
        } catch (e) {
            console.log(e);
            log.error({
                title: "ERROR VALIDATING FIELD",
                details: e
            });
        }
    };

    const checkDate = async (post_date, period) => {};

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    const saveRecord = async scriptContext => {};

    const getPeriodInfo = async period => {
        let quer = query.create({
            type: query.Type.ACCOUNTING_PERIOD
        });
        let periodIdCond = quer.createCondition({
            fieldId: "id",
            operator: query.Operator.ANY_OF,
            values: period
        });
        let adjustFilter = quer.createCondition({
            fieldId: "isadjust",
            operator: query.Operator.IS,
            values: false
        });
        let isYear = quer.createCondition({
            fieldId: "isyear",
            operator: query.Operator.IS,
            values: false
        });
        let isQuarter = quer.createCondition({
            fieldId: "isquarter",
            operator: query.Operator.IS,
            values: false
        });
        quer.condition = quer.and(
            periodIdCond,
            adjustFilter,
            isYear,
            isQuarter
        );
        quer.columns = [
            quer.createColumn({
                fieldId: "id"
            }),
            quer.createColumn({
                fieldId: "periodname",
                alias: "name"
            }),
            quer.createColumn({
                fieldId: "startdate"
            }),
            quer.createColumn({
                fieldId: "enddate"
            })
        ];
        quer.sort = [
            quer.createSort({
                column: quer.columns[2],
                ascending: true
            })
        ];
        const runProm = await quer.run.promise();
        const resultSet = runProm.asMappedResults();
        return resultSet[0];
    };
    const getExistingEntries = async (period, sub, include) => {
        try {
            let quer = query.create({
                type: query.Type.TRANSACTION
            });
            let periodIdCond = quer.createCondition({
                fieldId: "postingperiod",
                operator: query.Operator.ANY_OF,
                values: period
            });
            let typeCond = quer.createCondition({
                fieldId: "custbody_scg_adjustment_je",
                operator: query.Operator.IS,
                values: true
            });
            let lineJoin = quer.autoJoin({
                fieldId: "transactionLines"
            });
            let subJoin = lineJoin.autoJoin({
                fieldId: "subsidiary"
            });
            let subCond = subJoin.createCondition({
                fieldId: "id",
                operator: query.Operator.ANY_OF,
                values: sub
            });
            if (include) {
                let parentCond;
                if (sub != 1) {
                    parentCond = subJoin.createCondition({
                        fieldId: "parent",
                        operator: query.Operator.EQUAL,
                        values: sub
                    });
                } else {
                    parentCond = subJoin.createCondition({
                        fieldId: "parent",
                        operator: query.Operator.EMPTY_NOT
                    });
                }
                quer.condition = quer.and(
                    periodIdCond,
                    typeCond,
                    quer.or(subCond, parentCond)
                );
            } else {
                quer.condition = quer.and(periodIdCond, typeCond, subCond);
            }

            quer.columns = [
                quer.createColumn({
                    fieldId: "id",
                    groupBy: true
                })
            ];

            const runProm = await quer.run.promise();
            console.log(runProm.asMappedResults());
            return runProm.asMappedResults();
        } catch (e) {
            console.log(`ERROR GETTING EXISTING: ${e}`);
            log.error({
                title: "ERROR GETTING EXISTING",
                details: e
            });
        }
    };

    const getChildSubs = async sub => {
        try {
            let quer = query.create({
                type: query.Type.SUBSIDIARY
            });
            let parentCond;
            if (sub != 1) {
                console.log(`NOT Qs`);
                parentCond = quer.createCondition({
                    fieldId: "parent",
                    operator: query.Operator.EQUAL,
                    values: sub
                });
            } else {
                parentCond = quer.createCondition({
                    fieldId: "parent",
                    operator: query.Operator.EMPTY_NOT
                });
            }
            let notElim = quer.createCondition({
                fieldId: "iselimination",
                operator: query.Operator.IS,
                values: false
            });
            quer.condition = quer.and(parentCond, notElim);
            quer.columns = [
                quer.createColumn({
                    fieldId: "id"
                })
            ];
            const runProm = await quer.run.promise();
            console.log(runProm.asMappedResults());
            return runProm.asMappedResults();
        } catch (e) {
            console.error(`ERROR GETTING CHILDREN: ${e}`);
        }
    };

    const getPriorPeriodEntries = async (period, subs, endDate) => {
        try {
            let priorPeriodSearch = await search.load.promise({
                id: SEA_ID
            });
            let addFilters = [
                search.createFilter({
                    name: "subsidiary",
                    operator: search.Operator.ANYOF,
                    values: subs
                }),
                search.createFilter({
                    join: "accountingperiod",
                    name: "enddate",
                    operator: search.Operator.BEFORE,
                    values: endDate
                })
            ];
            priorPeriodSearch.filters.push(...addFilters);

            return await priorPeriodSearch.run().getRange.promise(0, 1000);
        } catch (e) {
            console.log(`ERROR GETTING PRIOR: ${e}`);
            log.error({
                title: "ERROR GETTING PRIOR",
                details: e
            });
        }
    };

    return {
        fieldChanged: fieldChanged,
        pageInit: pageInit,
        validateField: validateField
    };
});
