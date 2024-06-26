// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const {
  StateData,
  AnalysisError,
  AnalysisTypes,
} = require('core-lib');
const CreateCelebTrackIterator = require('./iterators/create-celeb-track');
const CreateFaceTrackIterator = require('./iterators/create-face-track');
const CreateFaceMatchTrackIterator = require('./iterators/create-face-match-track');
const CreateLabelTrackIterator = require('./iterators/create-label-track');
const CreateModerationTrackIterator = require('./iterators/create-moderation-track');
const CreatePersonTrackIterator = require('./iterators/create-person-track');
const CreateSegmentTrackIterator = require('./iterators/create-segment-track');
const CreateTextTrackIterator = require('./iterators/create-text-track');
const CreateCustomLabelTrackIterator = require('./iterators/create-custom-label-track');

const SUBCATEGORY_CELEB = AnalysisTypes.Rekognition.Celeb;
const SUBCATEGORY_FACE = AnalysisTypes.Rekognition.Face;
const SUBCATEGORY_FACEMATCH = AnalysisTypes.Rekognition.FaceMatch;
const SUBCATEGORY_LABEL = AnalysisTypes.Rekognition.Label;
const SUBCATEGORY_MODERATION = AnalysisTypes.Rekognition.Moderation;
const SUBCATEGORY_PERSON = AnalysisTypes.Rekognition.Person;
const SUBCATEGORY_SEGMENT = AnalysisTypes.Rekognition.Segment;
const SUBCATEGORY_TEXT = AnalysisTypes.Rekognition.Text;
const SUBCATEGORY_CUSTOMLABEL = AnalysisTypes.Rekognition.CustomLabel;

class StateCreateTrackIterator {
  constructor(stateData) {
    if (!(stateData instanceof StateData)) {
      throw new AnalysisError('stateData not StateData object');
    }
    this.$stateData = stateData;
  }

  get [Symbol.toStringTag]() {
    return 'StateCreateTrackIterator';
  }

  get stateData() {
    return this.$stateData;
  }

  async process() {
    const data = this.stateData.data;
    let iterator;
    if (data[SUBCATEGORY_CELEB]) {
      iterator = new CreateCelebTrackIterator(this.stateData);
    }
    else if (data[SUBCATEGORY_FACE]) {
      iterator = new CreateFaceTrackIterator(this.stateData);
    }
    else if (data[SUBCATEGORY_FACEMATCH]) {
      iterator = new CreateFaceMatchTrackIterator(this.stateData);
    }
    else if (data[SUBCATEGORY_LABEL]) {
      iterator = new CreateLabelTrackIterator(this.stateData);
    }
    else if (data[SUBCATEGORY_MODERATION]) {
      iterator = new CreateModerationTrackIterator(this.stateData);
    }
    else if (data[SUBCATEGORY_PERSON]) {
      iterator = new CreatePersonTrackIterator(this.stateData);
    }
    else if (data[SUBCATEGORY_SEGMENT]) {
      iterator = new CreateSegmentTrackIterator(this.stateData);
    }
    else if (data[SUBCATEGORY_TEXT]) {
      iterator = new CreateTextTrackIterator(this.stateData);
    }
    else if (data[SUBCATEGORY_CUSTOMLABEL]) {
      iterator = new CreateCustomLabelTrackIterator(this.stateData);
    }
    else {
      iterator = undefined;
    }
    if (!iterator) {
      const e = `iterator '${Object.keys(data).join(',')}' not impl`;
      console.error(e);
      throw new AnalysisError(e);
    }
    return iterator.process();
  }
}

module.exports = StateCreateTrackIterator;
