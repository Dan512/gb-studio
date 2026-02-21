const l10n = require("../helpers/l10n").default;

const id = "EVENT_IF_PUSHED_DIRECTION";
const groups = ["EVENT_GROUP_CONTROL_FLOW"];
const subGroups = {
  EVENT_GROUP_CONTROL_FLOW: "EVENT_GROUP_ACTOR",
};

const autoLabel = (fetchArg) => {
  const frames = fetchArg("holdFrames");
  if (frames && frames > 0) {
    return l10n("EVENT_IF_PUSHED_DIRECTION_FOR_LABEL", {
      direction: fetchArg("direction"),
      frames: String(frames),
    });
  }
  return l10n("EVENT_IF_PUSHED_DIRECTION_LABEL", {
    direction: fetchArg("direction"),
  });
};

const fields = [
  {
    key: "direction",
    label: l10n("FIELD_DIRECTION"),
    description: l10n("FIELD_DIRECTION_DESC"),
    type: "direction",
    defaultValue: "left",
    width: "50%",
  },
  {
    key: "holdFrames",
    label: l10n("FIELD_HOLD_FRAMES"),
    description: l10n("FIELD_HOLD_FRAMES_DESC"),
    type: "number",
    min: 0,
    max: 600,
    defaultValue: 0,
    width: "50%",
  },
  {
    key: "true",
    label: l10n("FIELD_TRUE"),
    description: l10n("FIELD_TRUE_DESC"),
    type: "events",
  },
  {
    key: "__collapseElse",
    label: l10n("FIELD_ELSE"),
    type: "collapsable",
    defaultValue: true,
    conditions: [
      {
        key: "__disableElse",
        ne: true,
      },
    ],
  },
  {
    key: "false",
    label: l10n("FIELD_FALSE"),
    description: l10n("FIELD_FALSE_DESC"),
    conditions: [
      {
        key: "__collapseElse",
        ne: true,
      },
      {
        key: "__disableElse",
        ne: true,
      },
    ],
    type: "events",
  },
];

const compile = (input, helpers) => {
  const { ifPushedDirection } = helpers;
  const truePath = input.true;
  const falsePath = input.__disableElse ? [] : input.false;
  ifPushedDirection(
    input.direction,
    input.holdFrames || 0,
    truePath,
    falsePath,
  );
};

module.exports = {
  id,
  description: l10n("EVENT_IF_PUSHED_DIRECTION_DESC"),
  autoLabel,
  groups,
  subGroups,
  fields,
  compile,
  isConditional: true,
};
