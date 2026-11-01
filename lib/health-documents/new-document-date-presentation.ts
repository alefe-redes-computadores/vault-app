// VAULT M5 — formatação e validação de data local, lógica histórica inalterada.
// Nenhuma consulta de rede, clock ou gravação de prescrição.

export function handleDateMask(
  value: string
): string {
  const clean =
    value
      .replace(
        /\D/g,
        ""
      )
      .slice(
        0,
        8
      );

  if (
    clean.length >
    4
  ) {
    return `${clean.slice(
      0,
      2
    )}/${clean.slice(
      2,
      4
    )}/${clean.slice(
      4
    )}`;
  }

  if (
    clean.length >
    2
  ) {
    return `${clean.slice(
      0,
      2
    )}/${clean.slice(
      2
    )}`;
  }

  return clean;
}

export function parseDateToISO(
  displayValue: string
): string {
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      displayValue
    )
  ) {
    return displayValue;
  }

  const clean =
    displayValue.replace(
      /\D/g,
      ""
    );

  if (
    clean.length !==
    8
  ) {
    return "";
  }

  const day =
    Number(
      clean.slice(
        0,
        2
      )
    );

  const month =
    Number(
      clean.slice(
        2,
        4
      )
    );

  const year =
    Number(
      clean.slice(
        4,
        8
      )
    );

  if (
    year <
      1900 ||
    month <
      1 ||
    month >
      12 ||
    day <
      1 ||
    day >
      31
  ) {
    return "";
  }

  const date =
    new Date(
      year,
      month -
        1,
      day
    );

  if (
    date.getFullYear() !==
      year ||
    date.getMonth() !==
      month -
        1 ||
    date.getDate() !==
      day
  ) {
    return "";
  }

  return [
    String(
      year
    ).padStart(
      4,
      "0"
    ),

    String(
      month
    ).padStart(
      2,
      "0"
    ),

    String(
      day
    ).padStart(
      2,
      "0"
    ),
  ].join(
    "-"
  );
}

export function formatDateDisplay(
  value?: string
): string {
  if (
    !value
  ) {
    return "";
  }

  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(
      value
    )
  ) {
    return value;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}/.test(
      value
    )
  ) {
    return value;
  }

  const [
    year,
    month,
    day,
  ] =
    value
      .slice(
        0,
        10
      )
      .split(
        "-"
      );

  return `${day}/${month}/${year}`;
}
