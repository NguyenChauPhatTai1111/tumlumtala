import type { ProfileFormValues } from "@components/user/dialog/types";
import { MenuItem, TextField } from "@mui/material";
import { Controller, useFormContext } from "react-hook-form";

type FormInputProps = {
	name: keyof ProfileFormValues;
	label: string;
	type?: string;
	select?: boolean;
	options?: { label: string; value: string }[];
	disabled?: boolean;
	min?: number;
	max?: number;
};

export const FormInput = ({
	name,
	label,
	type,
	min,
	max,
	select,
	options,
	disabled,
}: FormInputProps) => {
	const { control } = useFormContext<ProfileFormValues>();

	return (
		<Controller
			name={name}
			control={control}
			render={({ field, fieldState }) => (
				<TextField
					{...field}
					type={type}
					label={label}
					fullWidth
					select={select}
					disabled={disabled}
					error={!!fieldState.error}
					helperText={fieldState.error?.message}
					slotProps={{
						htmlInput: {
							min,
							max,
						},
					}}
				>
					{select &&
						options?.map((opt) => (
							<MenuItem key={opt.value} value={opt.value}>
								{opt.label}
							</MenuItem>
						))}
				</TextField>
			)}
		/>
	);
};
