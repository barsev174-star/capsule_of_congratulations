import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CasesSection } from "./cases-section";

describe("CasesSection", () => {
  it("keeps all six occasions and separates family birthdays from colleagues", () => {
    render(<CasesSection />);
    expect(screen.getAllByRole("article")).toHaveLength(6);
    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(screen.getByRole("link", { name: "На день рождения от близких" })).toHaveAttribute("href", "/gruppovaya-otkrytka/den-rozhdeniya");
    const birthdayCard = screen.getByRole("heading", { name: "День рождения", exact: true }).closest("article")!;
    expect(within(birthdayCard).getByRole("link", { name: "Открытка от друзей и близких" })).toHaveAttribute("href", "/gruppovaya-otkrytka/den-rozhdeniya");
    expect(screen.getByRole("link", { name: "Собрать слова коллег" })).toHaveAttribute("href", "/gruppovaya-otkrytka/kollege");
  });

  it("groups teacher and caregiver links without changing their destinations", () => {
    render(<CasesSection />);
    const card = screen.getByRole("heading", { name: "Учителю или воспитателю" }).closest("article")!;
    const teacher = within(card).getByRole("link", { name: "Учителю от класса" });
    const caregiver = within(card).getByRole("link", { name: "Воспитателю от группы" });
    expect(teacher.parentElement).toBe(caregiver.parentElement);
    expect(teacher).toHaveAttribute("href", "/gruppovaya-otkrytka/uchitelyu");
    expect(caregiver).toHaveAttribute("href", "/gruppovaya-otkrytka/vospitatelyu");
  });
});
