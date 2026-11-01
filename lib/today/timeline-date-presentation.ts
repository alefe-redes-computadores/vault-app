// VAULT M2 — derivacao de data de exibicao isolada; nenhuma escrita clinica.
import { addDaysToLocalDate } from "@/lib/health-utils";

export function describeTodayDate(hoje: string, requestedDate: string | null) {
  const requestedDateIsValid =
    Boolean(
      requestedDate &&
      /^\d{4}-\d{2}-\d{2}$/.test(
        requestedDate
      ) &&
      !Number.isNaN(
        new Date(
          `${requestedDate}T12:00:00`
        ).getTime()
      )
    );

  const dataSelecionada =
    requestedDateIsValid &&
    requestedDate
      ? requestedDate
      : hoje;

  const isHoje =
    dataSelecionada ===
    hoje;

  const isPassado =
    dataSelecionada <
    hoje;

  const isFuturo =
    dataSelecionada >
    hoje;

  const ontem =
    addDaysToLocalDate(
      hoje,
      -1
    );

  const amanha =
    addDaysToLocalDate(
      hoje,
      1
    );

  const dataSelecionadaLabel =
    dataSelecionada ===
    hoje
      ? "Hoje"
      : dataSelecionada ===
          ontem
        ? "Ontem"
        : dataSelecionada ===
            amanha
          ? "Amanhã"
          : new Intl.DateTimeFormat(
              "pt-BR",
              {
                weekday:
                  "long",

                day:
                  "2-digit",

                month:
                  "long",
              }
            ).format(
              new Date(
                `${dataSelecionada}T12:00:00`
              )
            );

  const dataSelecionadaDescricao =
    new Intl.DateTimeFormat(
      "pt-BR",
      {
        day:
          "2-digit",

        month:
          "2-digit",

        year:
          "numeric",
      }
    ).format(
      new Date(
        `${dataSelecionada}T12:00:00`
      )
    );

  return { dataSelecionada, isHoje, isPassado, isFuturo, ontem, amanha, dataSelecionadaLabel, dataSelecionadaDescricao };
}
