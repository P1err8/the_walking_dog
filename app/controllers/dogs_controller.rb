class DogsController < ApplicationController
  def show
    return redirect_to new_dog_path if current_user.dogs.empty?

    @dog = Dog.find(current_user.dogs.first.id)
  end

  def new
    @dog = Dog.new
  end

  def create
    @dog = Dog.new(dog_params.except(:tag_ids))
    @dog.user = current_user


    if @dog.save
      tag_ids = dog_params[:tag_ids].reject(&:blank?)
      Tag.where(id: tag_ids).each do |tag|
        DogsTag.create(dog: @dog, tag: tag)
      end

      redirect_to @dog
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
    @dog = current_user.dogs.find_by(id: params[:id])
    redirect_to new_dog_path unless @dog
  end

  def update
    @dog = current_user.dogs.find_by(id: params[:id])
    return redirect_to new_dog_path unless @dog

    # Supprimer les anciens tags
    @dog.dogs_tags.destroy_all

    if @dog.update(dog_params.except(:tag_ids))
      # Ajouter les nouveaux tags
      tag_ids = dog_params[:tag_ids]&.reject(&:blank?) || []
      Tag.where(id: tag_ids).each do |tag|
        DogsTag.create(dog: @dog, tag: tag)
      end

      redirect_to @dog, notice: "Profil mis à jour avec succès"
    else
      render :edit, status: :unprocessable_entity
    end
  end

  private

  def dog_params
    params.require(:dog).permit(:name, :age, :race, :size, tag_ids: [])
  end

end
