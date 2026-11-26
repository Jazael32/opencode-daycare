import { PokemonNavigator } from "@/app/components/pokemon/pokemon-navigator";

export default function PokemonPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-[420px]">
        <PokemonNavigator />
      </div>
    </div>
  );
}
