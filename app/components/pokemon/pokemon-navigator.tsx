"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Pokemon = {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: Array<{ type: { name: string } }>;
  sprites: {
    front_default: string | null;
    other: { "official-artwork": { front_default: string | null } };
  };
};

const FIRST_POKEMON_ID = 1;
const LAST_POKEMON_ID = 1025;

function formatName(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function PokemonNavigator() {
  const [pokemonId, setPokemonId] = useState(FIRST_POKEMON_ID);
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCurrentPokemon() {
      try {
        const response = await fetch(
          `https://pokeapi.co/api/v2/pokemon/${pokemonId}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data: Pokemon = await response.json();
        setPokemon(data);
        setError(null);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") {
          return;
        }
        setError("No se pudo cargar el Pokémon. Intenta de nuevo.");
      }
    }

    loadCurrentPokemon();

    return () => controller.abort();
  }, [pokemonId]);

  const isLoading = pokemon === null || pokemon.id !== pokemonId;
  const hasPrevious = pokemonId > FIRST_POKEMON_ID;
  const hasNext = pokemonId < LAST_POKEMON_ID;
  const artwork = pokemon?.sprites.other["official-artwork"].front_default
    ?? pokemon?.sprites.front_default
    ?? null;

  return (
    <section className="rounded-[20px] border border-border bg-surface px-[22px] py-5 shadow-[0_4px_16px_-12px_rgba(120,90,60,0.5)]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="m-0 font-heading text-[22px] font-semibold text-ink">
          Pokémon actual
        </h2>
        <span className="rounded-full bg-brand-soft px-3 py-1.5 text-[12px] font-extrabold tracking-[0.5px] text-brand-strong">
          #{pokemonId}
        </span>
      </div>

      {/* Content */}
      {error ? (
        <p className="m-0 text-[15px] text-brand-strong">{error}</p>
      ) : isLoading || pokemon === null ? (
        <p className="m-0 text-[15px] text-muted">Cargando Pokémon…</p>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {artwork ? (
            <Image
              src={artwork}
              alt={`Ilustración de ${formatName(pokemon.name)}`}
              width={220}
              height={220}
              className="h-[220px] w-[220px] object-contain"
              priority
            />
          ) : (
            <span className="flex h-[220px] w-[220px] items-center justify-center rounded-2xl bg-photo-bg text-photo-ink">
              Sin imagen
            </span>
          )}

          <p className="m-0 font-heading text-[26px] font-semibold text-ink">
            {formatName(pokemon.name)}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {pokemon.types.map(({ type }) => (
              <span
                key={type.name}
                className="rounded-full bg-photo-bg px-3 py-1.5 text-[12.5px] font-extrabold text-photo-ink"
              >
                {formatName(type.name)}
              </span>
            ))}
          </div>

          <p className="m-0 text-[13.5px] text-muted">
            Altura: {(pokemon.height / 10).toFixed(1)} m · Peso:{" "}
            {(pokemon.weight / 10).toFixed(1)} kg
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-divider pt-4">
        <button
          type="button"
          onClick={() =>
            setPokemonId((currentId) =>
              Math.max(FIRST_POKEMON_ID, currentId - 1),
            )
          }
          disabled={!hasPrevious || isLoading}
          className="flex items-center gap-2 rounded-full bg-brand-soft px-5 py-2.5 text-[14px] font-extrabold text-brand-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Anterior
        </button>

        <button
          type="button"
          onClick={() =>
            setPokemonId((currentId) =>
              Math.min(LAST_POKEMON_ID, currentId + 1),
            )
          }
          disabled={!hasNext || isLoading}
          className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-[14px] font-extrabold text-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </section>
  );
}
