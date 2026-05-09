import React, { useState } from 'react';
import { Check, ChevronsUpDown, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface FornecedorOption {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  empresa?: string;
}

interface FornecedorClienteComboboxProps {
  fornecedores: FornecedorOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export const FornecedorClienteCombobox: React.FC<FornecedorClienteComboboxProps> = ({
  fornecedores,
  value,
  onValueChange,
  placeholder = "Digite para buscar fornecedor/cliente..."
}) => {
  const [open, setOpen] = useState(false);
  const fornecedoresSafe = fornecedores || [];

  const selectedFornecedor = fornecedoresSafe.find(f => f.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedFornecedor ? (
            <span className="truncate">
              {selectedFornecedor.nome}
              {selectedFornecedor.empresa && ` - ${selectedFornecedor.empresa}`}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Digite para buscar..." />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center py-6 text-sm text-muted-foreground">
                <User className="h-8 w-8 mb-2" />
                Nenhum fornecedor/cliente encontrado
              </div>
            </CommandEmpty>
            <CommandGroup>
              {fornecedoresSafe.map((fornecedor) => (
                <CommandItem
                  key={fornecedor.id}
                  value={`${fornecedor.nome} ${fornecedor.empresa || ''} ${fornecedor.email || ''}`.toLowerCase()}
                  onSelect={() => {
                    onValueChange(fornecedor.id === value ? "" : fornecedor.id);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === fornecedor.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="font-medium">{fornecedor.nome}</span>
                    </div>
                    {fornecedor.empresa && (
                      <span className="text-sm text-muted-foreground ml-6">
                        {fornecedor.empresa}
                      </span>
                    )}
                    {fornecedor.email && (
                      <span className="text-xs text-muted-foreground ml-6">
                        {fornecedor.email}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
