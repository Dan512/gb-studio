import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { sceneSelectors } from "store/features/entities/entitiesState";
import entitiesActions from "store/features/entities/entitiesActions";
import editorActions from "store/features/editor/editorActions";
import {
  ActorNormalized,
  ScriptEventNormalized,
} from "shared/lib/entities/entitiesTypes";
import { LockIcon, LockOpenIcon } from "ui/icons/Icons";
import { CheckboxField } from "ui/form/CheckboxField";
import ScriptEditorDropdownButton from "components/script/ScriptEditorDropdownButton";
import ScriptEditor from "components/script/ScriptEditor";
import { StickyTabs, TabBar, TabSettings } from "ui/tabs/Tabs";
import { Button } from "ui/buttons/Button";
import { ScriptEditorContext } from "components/script/ScriptEditorContext";
import l10n from "shared/lib/lang/l10n";
import { castEventToBool } from "renderer/lib/helpers/castEventValue";
import { useAppDispatch, useAppSelector } from "store/hooks";
import type { ScriptEditorCtx } from "shared/lib/scripts/context";

interface ActorEditorScriptsProps {
  actor: ActorNormalized;
  sceneId: string;
}

interface ScriptHandler {
  value: ScriptEventNormalized[];
  onChange: (newValue: ScriptEventNormalized[]) => void;
}

interface ScriptHandlers {
  start: ScriptHandler;
  interact: ScriptHandler;
  update: ScriptHandler;
  pushed: ScriptHandler;
  pulled: ScriptHandler;
  hit: {
    hitPlayer: ScriptHandler;
    hit1: ScriptHandler;
    hit2: ScriptHandler;
    hit3: ScriptHandler;
  };
}

type ActorScriptKey =
  | "script"
  | "startScript"
  | "updateScript"
  | "hit1Script"
  | "hit2Script"
  | "hit3Script";

type DefaultTab = "interact" | "start" | "update";
type CollisionTab = "hit" | "start" | "update";
type PushableTab = "pushed" | "start" | "update";
type PullableTab = "pulled" | "start" | "update";
type PushPullTab = "pushed" | "pulled" | "start" | "update";
type HitTab = "hitPlayer" | "hit1" | "hit2" | "hit3";

const getScriptKey = (
  primaryTab: DefaultTab | CollisionTab | PushableTab | PullableTab | PushPullTab,
  secondaryTab: HitTab,
): ActorScriptKey => {
  if (primaryTab === "interact") {
    return "script";
  }
  if (primaryTab === "pushed") {
    return "hit1Script";
  }
  if (primaryTab === "pulled") {
    return "hit2Script";
  }
  if (primaryTab === "start") {
    return "startScript";
  }
  if (primaryTab === "update") {
    return "updateScript";
  }
  if (primaryTab === "hit") {
    if (secondaryTab === "hitPlayer") {
      return "script";
    }
    if (secondaryTab === "hit1") {
      return "hit1Script";
    }
    if (secondaryTab === "hit2") {
      return "hit2Script";
    }
    if (secondaryTab === "hit3") {
      return "hit3Script";
    }
  }
  return "script";
};

export const ActorEditorScripts: FC<ActorEditorScriptsProps> = ({
  actor,
  sceneId,
}) => {
  const scene = useAppSelector((state) =>
    sceneSelectors.selectById(state, sceneId),
  );
  const lockScriptEditor = useAppSelector(
    (state) => state.editor.lockScriptEditor,
  );

  const defaultTabs: Record<DefaultTab, string> = useMemo(
    () => ({
      interact: l10n("SIDEBAR_ON_INTERACT"),
      start: l10n("SIDEBAR_ON_INIT"),
      update: l10n("SIDEBAR_ON_UPDATE"),
    }),
    [],
  );

  const collisionTabs: Record<CollisionTab, string> = useMemo(
    () => ({
      hit: l10n("SIDEBAR_ON_HIT"),
      start: l10n("SIDEBAR_ON_INIT"),
      update: l10n("SIDEBAR_ON_UPDATE"),
    }),
    [],
  );

  const hitTabs: Record<HitTab, string> = useMemo(
    () => ({
      hitPlayer: l10n("FIELD_PLAYER"),
      hit1: l10n("FIELD_COLLISION_GROUP_N", { n: 1 }),
      hit2: l10n("FIELD_COLLISION_GROUP_N", { n: 2 }),
      hit3: l10n("FIELD_COLLISION_GROUP_N", { n: 3 }),
    }),
    [],
  );

  const pushableTabs: Record<PushableTab, string> = useMemo(
    () => ({
      pushed: l10n("SIDEBAR_ON_PUSHED"),
      start: l10n("SIDEBAR_ON_INIT"),
      update: l10n("SIDEBAR_ON_UPDATE"),
    }),
    [],
  );

  const pullableTabs: Record<PullableTab, string> = useMemo(
    () => ({
      pulled: l10n("SIDEBAR_ON_PULLED"),
      start: l10n("SIDEBAR_ON_INIT"),
      update: l10n("SIDEBAR_ON_UPDATE"),
    }),
    [],
  );

  const pushPullTabs: Record<PushPullTab, string> = useMemo(
    () => ({
      pushed: l10n("SIDEBAR_ON_PUSHED"),
      pulled: l10n("SIDEBAR_ON_PULLED"),
      start: l10n("SIDEBAR_ON_INIT"),
      update: l10n("SIDEBAR_ON_UPDATE"),
    }),
    [],
  );

  const isPushable =
    actor?.collisionExtraFlags?.includes("pushable") &&
    actor?.collisionExtraFlags?.includes("solid");

  const isPullable =
    actor?.collisionExtraFlags?.includes("pullable") &&
    actor?.collisionExtraFlags?.includes("solid");

  const activeTabs = (isPushable && isPullable)
    ? pushPullTabs
    : isPushable
      ? pushableTabs
      : isPullable
        ? pullableTabs
        : actor?.collisionGroup
          ? collisionTabs
          : defaultTabs;

  const tabs = Object.keys(activeTabs);
  const secondaryTabs = Object.keys(hitTabs);
  const lastScriptTab = useAppSelector((state) => state.editor.lastScriptTab);
  const lastScriptTabSecondary = useAppSelector(
    (state) => state.editor.lastScriptTabSecondary,
  );
  const initialTab = tabs.includes(lastScriptTab) ? lastScriptTab : tabs[0];
  const initialSecondaryTab = secondaryTabs.includes(lastScriptTabSecondary)
    ? lastScriptTabSecondary
    : secondaryTabs[0];

  const [scriptMode, setScriptMode] = useState<keyof ScriptHandlers>(
    initialTab as keyof ScriptHandlers,
  );
  const [scriptModeSecondary, setScriptModeSecondary] = useState<
    keyof ScriptHandlers["hit"]
  >(initialSecondaryTab as keyof ScriptHandlers["hit"]);

  // Make sure currently selected script tab is available
  // when collision group or pushable is modified otherwise use first available tab
  useEffect(() => {
    const tabs = Object.keys(activeTabs);
    if (!tabs.includes(scriptMode)) {
      setScriptMode(tabs[0] as keyof ScriptHandlers);
    }
  }, [scriptMode, activeTabs]);

  const dispatch = useAppDispatch();

  const onChangeScriptMode = (mode: keyof ScriptHandlers) => {
    setScriptMode(mode);
    dispatch(editorActions.setScriptTab(mode));
  };

  const onChangeScriptModeSecondary = (mode: keyof ScriptHandlers["hit"]) => {
    setScriptModeSecondary(mode);
    dispatch(editorActions.setScriptTabSecondary(mode));
  };

  const onChangeActorProp = useCallback(
    <K extends keyof ActorNormalized>(key: K, value: ActorNormalized[K]) => {
      dispatch(
        entitiesActions.editActor({
          actorId: actor.id,
          changes: {
            [key]: value,
          },
        }),
      );
    },
    [dispatch, actor.id],
  );

  const onChangePersistent = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChangeActorProp("persistent", castEventToBool(e)),
    [onChangeActorProp],
  );

  const onToggleLockScriptEditor = () => {
    dispatch(editorActions.setLockScriptEditor(!lockScriptEditor));
  };

  const scriptKey = getScriptKey(scriptMode, scriptModeSecondary);

  const scriptCtx: ScriptEditorCtx = useMemo(
    () => ({
      type: "entity",
      entityType: "actor",
      entityId: actor.id,
      sceneId,
      scriptKey,
    }),
    [actor.id, sceneId, scriptKey],
  );

  if (!scene || !actor) {
    return <div />;
  }

  const lockButton = (
    <Button
      size="small"
      variant={lockScriptEditor ? "primary" : "transparent"}
      onClick={onToggleLockScriptEditor}
      title={
        lockScriptEditor
          ? l10n("FIELD_UNLOCK_SCRIPT_EDITOR")
          : l10n("FIELD_LOCK_SCRIPT_EDITOR")
      }
    >
      {lockScriptEditor ? <LockIcon /> : <LockOpenIcon />}
    </Button>
  );

  const scriptButton = (
    <ScriptEditorDropdownButton
      value={actor[scriptKey]}
      type="actor"
      entityId={actor.id}
      scriptKey={scriptKey}
    />
  );

  return (
    <>
      <StickyTabs>
        <TabBar
          value={scriptMode as DefaultTab & CollisionTab & PushableTab & PullableTab & PushPullTab}
          values={activeTabs as Record<DefaultTab & CollisionTab & PushableTab & PullableTab & PushPullTab, string>}
          onChange={onChangeScriptMode as (mode: DefaultTab & CollisionTab & PushableTab & PullableTab & PushPullTab) => void}
          overflowActiveTab={
            scriptMode === "hit" ||
            scriptMode === "update" ||
            (scriptMode as string) === "pushed" ||
            (scriptMode as string) === "pulled"
          }
          buttons={
            <>
              {lockButton}
              {scriptButton}
            </>
          }
        />
        {scriptMode === "hit" && (
          <TabBar
            variant="secondary"
            value={scriptModeSecondary}
            values={hitTabs}
            onChange={onChangeScriptModeSecondary}
          />
        )}
        {scriptMode === "update" && (
          <TabSettings>
            <CheckboxField
              name="persistent"
              label={l10n("FIELD_KEEP_RUNNING_WHILE_OFFSCREEN")}
              checked={actor.persistent}
              onChange={onChangePersistent}
            />
          </TabSettings>
        )}
      </StickyTabs>

      <ScriptEditorContext.Provider value={scriptCtx}>
        <ScriptEditor value={actor[scriptKey]} />
      </ScriptEditorContext.Provider>
    </>
  );
};
