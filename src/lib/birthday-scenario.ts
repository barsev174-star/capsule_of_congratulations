// A content scenario on an existing template, not a separate template ID.
export const BIRTHDAY_EXAMPLE_PATH = "/example?template=paper-birthday&scenario=birthday";

export const isBirthdayExample = (template: string | undefined, scenario: string | undefined) =>
  scenario === "birthday" && (!template || template === "paper" || template === "paper-birthday");
