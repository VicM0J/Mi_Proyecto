import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Swal from 'sweetalert2';
import { useEffect } from 'react';


interface RepositionPiece {
  talla: string;
  cantidad: number;
  folioOriginal?: string;
}

interface RepositionFormData {
  type: 'repocision' | 'reproceso';
  solicitanteNombre: string;
  noSolicitud: string;
  noHoja?: string;
  causanteDano: string;
  solicitanteArea: 'patronaje' | 'corte' | 'bordado' | 'ensamble' | 'plancha' | 'calidad' | 'operaciones' | 'admin';
  currentArea: 'patronaje' | 'corte' | 'bordado' | 'ensamble' | 'plancha' | 'calidad' | 'operaciones' | 'admin';
  descripcionSuceso: string;
  modeloPrenda: string;
  tela: string;
  color: string;
  tipoPieza: string;
  urgencia: 'urgente' | 'intermedio' | 'poco_urgente';
  observaciones?: string;
  pieces: RepositionPiece[];
}

const areas = [
  'patronaje', 'corte', 'bordado', 'ensamble', 'plancha', 'calidad', 'operaciones'
];

const urgencyOptions = [
  { value: 'urgente', label: 'Urgente' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'poco_urgente', label: 'Poco Urgente' }
];

export function RepositionForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [pieces, setPieces] = useState<RepositionPiece[]>([{ talla: '', cantidad: 1, folioOriginal: '' }]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<RepositionFormData>({
    defaultValues: {
      type: 'repocision',
      urgencia: 'intermedio'
    }
  });
  useEffect(() => {
  register('solicitanteArea', { required: 'Campo requerido' });
  register('currentArea', { required: 'Campo requerido' });
}, [register]);



  const createRepositionMutation = useMutation({
    mutationFn: async (data: RepositionFormData) => {
      const response = await fetch('/api/repositions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, pieces }),
      });
      if (!response.ok) throw new Error('Failed to create reposition');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositions'] });
      Swal.fire({
        title: '¡Éxito!',
        text: 'Solicitud de reposición creada correctamente',
        icon: 'success',
        confirmButtonColor: '#8B5CF6'
      });
      onClose();
    },
    onError: (error) => {
      Swal.fire({
        title: 'Error',
        text: 'Error al crear la solicitud de reposición',
        icon: 'error',
        confirmButtonColor: '#8B5CF6'
      });
    }
  });

  const addPiece = () => {
    setPieces([...pieces, { talla: '', cantidad: 1, folioOriginal: '' }]);
  };

  const removePiece = (index: number) => {
    setPieces(pieces.filter((_, i) => i !== index));
  };

  const updatePiece = (index: number, field: keyof RepositionPiece, value: string | number) => {
    const newPieces = [...pieces];
    newPieces[index] = { ...newPieces[index], [field]: value };
    setPieces(newPieces);
  };

  const onSubmit = (data: RepositionFormData) => {
    if (pieces.some(p => !p.talla || p.cantidad < 1)) {
      Swal.fire({
        title: 'Error',
        text: 'Todos los campos de piezas son requeridos',
        icon: 'error',
        confirmButtonColor: '#8B5CF6'
      });
      return;
    }
    createRepositionMutation.mutate({ ...data, pieces });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-purple-800">Nueva Solicitud</h2>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>

          {/* Tipo de Solicitud */}
          <Card>
            <CardHeader>
              <CardTitle>Tipo de Solicitud</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup 
                value={watch('type')} 
                onValueChange={(value: 'repocision' | 'reproceso') => setValue('type', value)}
                className="flex space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="repocision" id="repocision" />
                  <Label htmlFor="repocision">Reposición</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reproceso" id="reproceso" />
                  <Label htmlFor="reproceso">Reproceso</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Información del Solicitante */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Solicitante</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="solicitanteNombre">Nombre del Solicitante *</Label>
                <Input
                  id="solicitanteNombre"
                  {...register('solicitanteNombre', { required: 'Campo requerido' })}
                  className={errors.solicitanteNombre ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <Label>Fecha de Solicitud</Label>
                <Input value={new Date().toLocaleDateString()} disabled />
              </div>
            </CardContent>
          </Card>

          {/* Número de Solicitud */}
          <Card>
            <CardHeader>
              <CardTitle>Número de Solicitud</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="noSolicitud">Número de Solicitud de Pedido *</Label>
                <Input
                  id="noSolicitud"
                  {...register('noSolicitud', { required: 'Campo requerido' })}
                  className={errors.noSolicitud ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <Label htmlFor="noHoja">Número de Hoja</Label>
                <Input id="noHoja" {...register('noHoja')} />
              </div>
            </CardContent>
          </Card>

          {/* Descripción del Daño */}
          <Card>
            <CardHeader>
              <CardTitle>Descripción del Daño</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="causanteDano">Nombre del Causante del Daño *</Label>
                <Input
                  id="causanteDano"
                  {...register('causanteDano', { required: 'Campo requerido' })}
                  className={errors.causanteDano ? 'border-red-500' : ''}
                />
              </div>
              <div>
  <Label htmlFor="solicitanteArea">Área que causó el daño *</Label>
<Select
  value={watch('solicitanteArea')}
  onValueChange={(value) => setValue('solicitanteArea', value as any)}
>
    <SelectTrigger>
      <SelectValue placeholder="Selecciona un área" />
    </SelectTrigger>
    <SelectContent>
      {areas.map((area) => (
        <SelectItem key={area} value={area}>
          {area.charAt(0).toUpperCase() + area.slice(1)}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  {errors.solicitanteArea && <p className="text-red-500 text-sm">Campo requerido</p>}
  <Label htmlFor="currentArea">Área actual *</Label>
<Select
  value={watch('currentArea')}
  onValueChange={(value) => setValue('currentArea', value as any)}
>
  <SelectTrigger>
    <SelectValue placeholder="Selecciona un área" />
  </SelectTrigger>
  <SelectContent>
    {areas.map((area) => (
      <SelectItem key={area} value={area}>
        {area.charAt(0).toUpperCase() + area.slice(1)}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
{errors.currentArea && <p className="text-red-500 text-sm">Campo requerido</p>}

</div>

              <div>
                <Label htmlFor="descripcionSuceso">Descripción del Suceso *</Label>
                <Textarea
                  id="descripcionSuceso"
                  {...register('descripcionSuceso', { required: 'Campo requerido' })}
                  className={errors.descripcionSuceso ? 'border-red-500' : ''}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Información del Producto */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Producto</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="modeloPrenda">Modelo de la Prenda *</Label>
                <Input
                  id="modeloPrenda"
                  {...register('modeloPrenda', { required: 'Campo requerido' })}
                  className={errors.modeloPrenda ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <Label htmlFor="tela">Tela *</Label>
                <Input
                  id="tela"
                  {...register('tela', { required: 'Campo requerido' })}
                  className={errors.tela ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <Label htmlFor="color">Color *</Label>
                <Input
                  id="color"
                  {...register('color', { required: 'Campo requerido' })}
                  className={errors.color ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <Label htmlFor="tipoPieza">Tipo de Pieza *</Label>
                <Input
                  id="tipoPieza"
                  placeholder="ej. Manga, Delantero, Cuello"
                  {...register('tipoPieza', { required: 'Campo requerido' })}
                  className={errors.tipoPieza ? 'border-red-500' : ''}
                />
              </div>
            </CardContent>
          </Card>

          {/* Piezas Solicitadas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Piezas Solicitadas
                <Button type="button" onClick={addPiece} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Pieza
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pieces.map((piece, index) => (
                  <div key={index} className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Label>Talla</Label>
                      <Input
                        value={piece.talla}
                        onChange={(e) => updatePiece(index, 'talla', e.target.value)}
                        placeholder="ej. S, M, L, XL"
                      />
                    </div>
                    <div className="flex-1">
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        min="1"
                        value={piece.cantidad}
                        onChange={(e) => updatePiece(index, 'cantidad', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="flex-1">
                      <Label>No° Folio Original</Label>
                      <Input
                        value={piece.folioOriginal || ''}
                        onChange={(e) => updatePiece(index, 'folioOriginal', e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>
                    {pieces.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removePiece(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Autorización */}
          <Card>
            <CardHeader>
              <CardTitle>Autorización</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nivel de Urgencia *</Label>
                <Select value={watch('urgencia')} onValueChange={(value: any) => setValue('urgencia', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {urgencyOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="observaciones">Otras Observaciones</Label>
                <Textarea
                  id="observaciones"
                  {...register('observaciones')}
                  rows={3}
                  placeholder="Comentarios adicionales..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createRepositionMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createRepositionMutation.isPending ? 'Creando...' : 'Crear Solicitud'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}