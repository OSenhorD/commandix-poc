import { LogOut, Moon, Sun, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/use-auth";
import { useTheme } from "@/shared/hooks/use-theme";

export function UserMenu() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    await navigate("/login", { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <User className="size-4" />
        {user.email}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between gap-2">
            Sessão
            <Badge variant="secondary">{user.role}</Badge>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggle}>
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {theme === "dark" ? "Tema claro" : "Tema escuro"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handleLogout()}>
          <LogOut className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
