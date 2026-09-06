// lib/repositories/healthIntelligenceDecisions.ts

import {
  db,
  safeAddSettings,
  safeUpdateSettings,
} from "@/lib/db";

import {
  enfileirarOperacao,
} from "@/lib/sync/enfileirarOperacao";

import type {
  AppSettings,
  HealthIntelligenceDecision,
  HealthIntelligenceDecisionAction,
} from "@/lib/types";

type DecisionTarget = {
  userId: string;
  personId: string;
  entityType: string;
  entityId: string;
  issueKey: string;
  detectedValue: string;
  suggestedValue?: string;
};

function clean(
  value:
    string | null | undefined
): string {
  return String(
    value ?? ""
  ).trim();
}

function normalized(
  value:
    string | null | undefined
): string {
  return clean(value)
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLocaleLowerCase(
      "pt-BR"
    )
    .replace(
      /\s+/g,
      " "
    );
}

function assertTarget(
  target:
    DecisionTarget
) {
  if (!clean(target.userId)) {
    throw new Error(
      "Usuário não identificado."
    );
  }

  if (!clean(target.personId)) {
    throw new Error(
      "Pessoa ativa não identificada."
    );
  }

  if (!clean(target.entityType)) {
    throw new Error(
      "Tipo da entidade não identificado."
    );
  }

  if (!clean(target.entityId)) {
    throw new Error(
      "Entidade não identificada."
    );
  }

  if (!clean(target.issueKey)) {
    throw new Error(
      "Tipo da inconsistência não identificado."
    );
  }

  if (!clean(target.detectedValue)) {
    throw new Error(
      "Valor analisado não identificado."
    );
  }
}

function sameDecisionTarget(
  decision:
    HealthIntelligenceDecision,
  target:
    DecisionTarget
): boolean {
  return (
    decision.person_id ===
      clean(target.personId) &&
    decision.entity_type ===
      clean(target.entityType) &&
    decision.entity_id ===
      clean(target.entityId) &&
    decision.issue_key ===
      clean(target.issueKey) &&
    normalized(
      decision.detected_value
    ) ===
      normalized(
        target.detectedValue
      ) &&
    normalized(
      decision.suggested_value
    ) ===
      normalized(
        target.suggestedValue
      )
  );
}

async function getSettingsForUser(
  userId:
    string
): Promise<AppSettings | null> {
  return (
    await db.settings
      .where(
        "user_id"
      )
      .equals(
        userId
      )
      .first()
  ) ?? null;
}

async function persistSettings(
  settings:
    AppSettings,
  operation:
    "add" | "update"
): Promise<void> {
  await enfileirarOperacao(
    "settings",
    operation,
    settings
  );
}

export const healthIntelligenceDecisionsRepository = {
  async getAll(
    userId:
      string
  ): Promise<
    HealthIntelligenceDecision[]
  > {
    const settings =
      await getSettingsForUser(
        clean(userId)
      );

    return Array.isArray(
      settings
        ?.health_intelligence_decisions
    )
      ? settings!
          .health_intelligence_decisions!
      : [];
  },

  async find(
    target:
      DecisionTarget
  ): Promise<
    HealthIntelligenceDecision | null
  > {
    assertTarget(
      target
    );

    const decisions =
      await this.getAll(
        clean(target.userId)
      );

    return (
      decisions.find(
        (
          decision
        ) =>
          sameDecisionTarget(
            decision,
            target
          )
      ) ??
      null
    );
  },

  async isDismissed(
    target:
      DecisionTarget
  ): Promise<boolean> {
    const decision =
      await this.find(
        target
      );

    return (
      decision?.decision ===
      "dismissed"
    );
  },

  async setDecision(
    target:
      DecisionTarget,
    action:
      HealthIntelligenceDecisionAction
  ): Promise<
    HealthIntelligenceDecision
  > {
    assertTarget(
      target
    );

    const userId =
      clean(
        target.userId
      );

    const existingSettings =
      await getSettingsForUser(
        userId
      );

    const currentDecisions =
      Array.isArray(
        existingSettings
          ?.health_intelligence_decisions
      )
        ? existingSettings!
            .health_intelligence_decisions!
        : [];

    /*
     * Remove apenas a decisão para a MESMA inconsistência,
     * com o MESMO valor detectado e a MESMA sugestão.
     *
     * Se o dado mudar, uma nova inconsistência pode aparecer.
     */
    const filtered =
      currentDecisions.filter(
        (
          decision
        ) =>
          !sameDecisionTarget(
            decision,
            target
          )
      );

    const decision:
      HealthIntelligenceDecision = {
      person_id:
        clean(
          target.personId
        ),

      entity_type:
        clean(
          target.entityType
        ),

      entity_id:
        clean(
          target.entityId
        ),

      issue_key:
        clean(
          target.issueKey
        ),

      detected_value:
        clean(
          target.detectedValue
        ),

      suggested_value:
        clean(
          target.suggestedValue
        ) ||
        undefined,

      decision:
        action,

      reviewed_at:
        new Date()
          .toISOString(),
    };

    const nextDecisions = [
      ...filtered,
      decision,
    ];

    if (!existingSettings) {
      const id =
        await safeAddSettings({
          user_id:
            userId,

          health_intelligence_decisions:
            nextDecisions,
        });

      const created =
        await db.settings.get(
          id
        );

      if (!created) {
        throw new Error(
          "Falha ao reler configurações após criação."
        );
      }

      await persistSettings(
        created,
        "add"
      );

      return decision;
    }

    await safeUpdateSettings(
      existingSettings.id,
      {
        health_intelligence_decisions:
          nextDecisions,
      }
    );

    const updated =
      await db.settings.get(
        existingSettings.id
      );

    if (!updated) {
      throw new Error(
        "Falha ao reler configurações após atualização."
      );
    }

    await persistSettings(
      updated,
      "update"
    );

    return decision;
  },

  async dismiss(
    target:
      DecisionTarget
  ): Promise<
    HealthIntelligenceDecision
  > {
    return this.setDecision(
      target,
      "dismissed"
    );
  },

  async accept(
    target:
      DecisionTarget
  ): Promise<
    HealthIntelligenceDecision
  > {
    return this.setDecision(
      target,
      "accepted"
    );
  },
};

export type {
  DecisionTarget as HealthIntelligenceDecisionTarget,
};
