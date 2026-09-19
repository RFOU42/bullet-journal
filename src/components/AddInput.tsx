import { useState, type FormEvent } from "react";

interface Props {
  placeholder: string;
  onAdd: (value: string) => void;
}

/** A dotted write-on line that submits on Enter — the "+ ajouter" affordance. */
export function AddInput({ placeholder, onAdd }: Props) {
  const [value, setValue] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  };

  return (
    <form onSubmit={submit}>
      <input
        className="input-line"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </form>
  );
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}
