// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import * as debug_ from "debug";
import { TApiMethod } from "readium-desktop/common/api/api.type";
// import { error } from "readium-desktop/common/error";
import { DialogType, DialogTypeName } from "readium-desktop/common/models/dialog";
import { apiActions, dialogActions } from "readium-desktop/common/redux/actions";
import { takeSpawnEvery } from "readium-desktop/common/redux/sagas/takeSpawnEvery";
import { selectTyped } from "readium-desktop/common/redux/sagas/typed-saga";
import { ICommonRootState } from "readium-desktop/common/redux/states/renderer/commonRootState";
import { PublicationView } from "readium-desktop/common/views/publication";
import { ReturnPromiseType } from "readium-desktop/typings/promise";
import { stringArrayEqual } from "readium-desktop/utils/stringArrayEqual";
import { call, put, race, take } from "redux-saga/effects";

// Logger
const filename_ = "readium-desktop:renderer:redux:saga:publication-info-syncTags";
const debug = debug_(filename_);
debug("_");

function* apiResult(action: apiActions.result.TAction) {

    // format the received API payload
    if (!action.error) {
        if (action.meta.api.methodId === "updateTags") {
            const publicationView = action.payload as ReturnPromiseType<TApiMethod["publication/updateTags"]>;
            const tagsArray = publicationView.tags;
            const publicationFromDialog = (yield* selectTyped((state: ICommonRootState) =>
                // tslint:disable-next-line: max-line-length
                (state.dialog.data as DialogType[DialogTypeName.PublicationInfoReader])?.publication)) as PublicationView;

            if (
                publicationFromDialog.identifier === publicationView.identifier
                && !stringArrayEqual(tagsArray, publicationFromDialog.tags)
            ) {
                yield put(dialogActions.updateRequest.build<DialogTypeName.PublicationInfoLib>(
                    {
                        publication: {
                            ...publicationFromDialog,
                            ...{
                                tags: tagsArray,
                            },
                        },
                    },
                ));
            }
        }
    }
}

function* dialogOpened(_action: dialogActions.openRequest.TAction) {

    while (true) {
        const { api, can } = yield race({
            api: take(apiActions.result.ID),
            can: take(dialogActions.closeRequest.ID),
        });

        if (can) {
            return ;
        }

        yield call(apiResult, api);
    }
}

export function saga() {
    return takeSpawnEvery(
        dialogActions.openRequest.ID,
        dialogOpened,
    );
}
