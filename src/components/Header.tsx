"use client";

import Link from "next/link";
import { Utensils, LogIn, LogOut, UserCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./ThemeToggle";

export default function Header() {
  const { user, loadingAuthState, signInWithGoogle, signOut } = useAuth();

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-2xl font-bold text-primary hover:text-primary/90 transition-colors"
        >
          <Utensils className="h-7 w-7" />
          <span>LocalEats</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {loadingAuthState ? (
            <Button variant="outline" disabled>
              Cargando...
            </Button>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={user.photoURL || undefined}
                      alt={user.displayName || "Usuario"}
                    />
                    <AvatarFallback>
                      {user.displayName ? (
                        user.displayName.charAt(0).toUpperCase()
                      ) : (
                        <UserCircle size={20} />
                      )}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.displayName || "Usuario Autenticado"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" onClick={signInWithGoogle}>
              <LogIn className="mr-2 h-4 w-4" />
              Ingresar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
